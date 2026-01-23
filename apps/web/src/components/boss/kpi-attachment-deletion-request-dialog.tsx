'use client';

import { useState } from 'react';
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
import { kpiAttachmentApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { fixFileNameEncoding } from '@/lib/utils/encoding-fix';

interface KpiAttachmentDeletionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachmentId: string;
  fileName: string;
  onSubmitted?: () => void;
}

export function KpiAttachmentDeletionRequestDialog({
  open,
  onOpenChange,
  attachmentId,
  fileName,
  onSubmitted,
}: KpiAttachmentDeletionRequestDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [replacementFileId, setReplacementFileId] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

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

      onSubmitted?.();
      onOpenChange(false);

      // Reset form
      setReason('');
      setReplacementFileId(null);

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
      <DialogContent className="sm:max-w-[500px]">
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
              If you have a replacement file, upload it first and provide its
              ID here. This feature will be enhanced in a future update.
            </p>
            <input
              type="text"
              placeholder="Replacement file ID (optional)"
              value={replacementFileId || ''}
              onChange={(e) => setReplacementFileId(e.target.value || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
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
