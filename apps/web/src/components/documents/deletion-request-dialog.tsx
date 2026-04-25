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
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

interface DeletionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  onSubmitted?: () => void;
}

export function DeletionRequestDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  onSubmitted,
}: DeletionRequestDialogProps) {
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
  const [isoMetadata, setIsoMetadata] = useState<{
    preparerName?: string | null;
    reviewerName?: string | null;
    approverName?: string | null;
    approvalDate?: string | null;
    receiptDate?: string | null;
    storageLocation?: string | null;
    documentNo?: string | null;
    revisionLabel?: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch document info to get upload metadata when dialog opens
  useEffect(() => {
    if (open && documentId) {
      api
        .get<{
          folderId: string;
          levelId: string;
          preparerName?: string | null;
          reviewerName?: string | null;
          approverName?: string | null;
          approvalDate?: string | null;
          receiptDate?: string | null;
          storageLocation?: string | null;
          documentNo?: string | null;
          revisionLabel?: string | null;
        }>(
          `/storage/documents/${documentId}`,
        )
        .then((doc) => {
          setFolderId(doc.folderId);
          setLevelId(doc.levelId);
          setIsoMetadata({
            preparerName: doc.preparerName ?? null,
            reviewerName: doc.reviewerName ?? null,
            approverName: doc.approverName ?? null,
            approvalDate: doc.approvalDate ?? null,
            receiptDate: doc.receiptDate ?? null,
            storageLocation: doc.storageLocation ?? null,
            documentNo: doc.documentNo ?? null,
            revisionLabel: doc.revisionLabel ?? null,
          });
        })
        .catch((error) => {
          console.error('Failed to fetch document:', error);
        });
    }
  }, [open, documentId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setReason('');
      setReplacementFileId(null);
      setReplacementFile(null);
      setFolderId(null);
      setLevelId(null);
      setIsoMetadata(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!folderId || !levelId || !isoMetadata) {
      toast({
        title: 'Error',
        description: 'Please wait for document information to load',
        variant: 'destructive',
      });
      return;
    }

    const hasRequiredIsoMetadata =
      !!isoMetadata.preparerName?.trim() &&
      !!isoMetadata.reviewerName?.trim() &&
      !!isoMetadata.approverName?.trim() &&
      !!isoMetadata.approvalDate?.trim() &&
      !!isoMetadata.receiptDate?.trim() &&
      !!isoMetadata.storageLocation?.trim();

    if (!hasRequiredIsoMetadata) {
      toast({
        title: 'Missing metadata',
        description:
          'Document metadata is incomplete. Please update ISO metadata before uploading replacement file.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingFile(true);
    try {
      const uploadData = Object.fromEntries(
        Object.entries({
          folderId,
          levelId,
          preparerName: isoMetadata.preparerName,
          reviewerName: isoMetadata.reviewerName,
          approverName: isoMetadata.approverName,
          approvalDate: isoMetadata.approvalDate,
          receiptDate: isoMetadata.receiptDate,
          storageLocation: isoMetadata.storageLocation,
          documentNo: isoMetadata.documentNo,
          revisionLabel: isoMetadata.revisionLabel,
        }).filter(([, value]) => typeof value === 'string' && value.trim() !== ''),
      ) as Record<string, string>;

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
      await api.post(`/storage/documents/${documentId}/deletion-requests`, {
        reason: reason.trim(),
        replacementFileId: replacementFileId || undefined,
      });

      onSubmitted?.();
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Document Deletion</DialogTitle>
          <DialogDescription>
            This document is past the 72-hour self-deletion window. Submit a
            request to DCC for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Document</Label>
            <div className="text-sm text-muted-foreground">{documentName}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for deletion <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this document should be deleted..."
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
              Upload a replacement file if you have one. When DCC approves, the
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
                  onChange={handleFileSelect}
                  disabled={uploadingFile || !folderId || !levelId || !isoMetadata}
                  className="hidden"
                  id="replacement-file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={uploadingFile || !folderId || !levelId || !isoMetadata}
                >
                  <label
                    htmlFor="replacement-file-upload"
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
