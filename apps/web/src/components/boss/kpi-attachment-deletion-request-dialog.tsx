'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api, kpiAttachmentApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { fixFileNameEncoding } from '@/lib/utils/encoding-fix';
import { Upload, X } from 'lucide-react';

interface KpiAttachmentDeletionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachmentId: string;
  documentId: string;
  fileName: string;
  onSubmitted?: () => void;
}

export function KpiAttachmentDeletionRequestDialog({
  open,
  onOpenChange,
  attachmentId,
  documentId,
  fileName,
  onSubmitted,
}: KpiAttachmentDeletionRequestDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [replacementFileId, setReplacementFileId] = useState<string | null>(
    null,
  );
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [levelId, setLevelId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replacementFileIdRef = useRef<string | null>(null);
  const submittedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    replacementFileIdRef.current = replacementFileId;
  }, [replacementFileId]);

  // Fetch document info to get folderId and levelId when dialog opens
  useEffect(() => {
    if (open && documentId) {
      submittedRef.current = false;
      api
        .get<{
          folderId: string;
          levelId: string;
        }>(`/storage/documents/${documentId}`)
        .then((doc) => {
          setFolderId(doc.folderId);
          setLevelId(doc.levelId);
        })
        .catch((error) => {
          console.error('Failed to fetch document info:', error);
        });
    }
  }, [open, documentId]);

  // Cleanup orphaned replacement file when dialog closes without submitting
  useEffect(() => {
    if (!open) {
      const orphanedFileId = replacementFileIdRef.current;
      if (orphanedFileId && !submittedRef.current) {
        // Delete the orphaned replacement file from server
        api.delete(`/storage/documents/${orphanedFileId}`).catch((err) => {
          console.warn('Failed to cleanup orphaned replacement file:', err);
        });
      }
      // Reset form
      setReason('');
      setReplacementFileId(null);
      setReplacementFile(null);
      setFolderId(null);
      setLevelId(null);
      replacementFileIdRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // KPI attachments must be PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Error',
        description: 'Only PDF files are allowed for KPI attachments',
        variant: 'destructive',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!folderId) {
      toast({
        title: 'Error',
        description: 'Please wait for document information to load',
        variant: 'destructive',
      });
      return;
    }

    setUploadingFile(true);
    try {
      const uploadData: Record<string, string> = {
        folderId,
      };
      if (levelId) {
        uploadData.levelId = levelId;
      }

      const uploadedDoc = await api.upload<{ id: string }>(
        '/storage/documents/upload',
        file,
        uploadData,
      );
      setReplacementFileId(uploadedDoc.id);
      setReplacementFile(file);
      toast({
        title: 'Success',
        description: 'Replacement file uploaded successfully',
        variant: 'default',
      });
    } catch (error: unknown) {
      const apiError = error as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      toast({
        title: 'Error',
        description:
          apiError.response?.data?.message ||
          apiError.message ||
          'Failed to upload replacement file',
        variant: 'destructive',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    if (replacementFileId) {
      api.delete(`/storage/documents/${replacementFileId}`).catch((err) => {
        console.warn('Failed to delete replacement file:', err);
      });
    }
    setReplacementFile(null);
    setReplacementFileId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for deletion',
        variant: 'destructive',
      });
      return;
    }

    if (reason.trim().length < 10) {
      toast({
        title: 'Error',
        description: 'Reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await kpiAttachmentApi.submitDeletionRequest(
        attachmentId,
        reason.trim(),
        replacementFileId || undefined,
      );

      submittedRef.current = true;
      onSubmitted?.();
      onOpenChange(false);

      toast({
        title: 'Success',
        description: 'Deletion request submitted successfully',
      });
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description:
          apiError.response?.data?.message ||
          apiError.message ||
          'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Request KPI Attachment Deletion</DialogTitle>
          <DialogDescription>
            This attachment is past the 72-hour self-deletion window. Submit a
            request to DCC for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">File</Label>
            <div className="text-sm text-muted-foreground">{fixFileNameEncoding(fileName)}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for deletion <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this attachment should be deleted..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Replacement file (optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Upload a replacement PDF file if you have one. When DCC approves, the
              new file will replace the old one. If rejected, the new file will
              be deleted.
            </p>
            {replacementFile ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                <span className="text-sm flex-1 truncate">
                  {replacementFile.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={uploadingFile || !folderId}
                  className="hidden"
                  id="kpi-replacement-file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={uploadingFile || !folderId}
                >
                  <label
                    htmlFor="kpi-replacement-file-upload"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    <span>
                      {uploadingFile
                        ? 'Uploading...'
                        : 'Upload replacement file'}
                    </span>
                  </label>
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || reason.trim().length < 10 || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
