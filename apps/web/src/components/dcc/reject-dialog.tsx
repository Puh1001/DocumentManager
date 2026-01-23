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
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSubmitted?: () => void;
}

export function RejectDialog({
  open,
  onOpenChange,
  requestId,
  onSubmitted,
}: RejectDialogProps) {
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/storage/deletion-requests/${requestId}/review`, {
        approve: false,
        comment: comment || undefined,
      });

      onSubmitted?.();
      onOpenChange(false);
      setComment('');
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description:
          apiError.response?.data?.message ||
          apiError.message ||
          'Failed to reject request',
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
          <DialogTitle>Reject Deletion Request</DialogTitle>
          <DialogDescription>
            Provide a reason for rejection (optional)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="comment" className="text-sm font-medium">
            Comment (optional)
          </Label>
          <Textarea
            id="comment"
            placeholder="Explain why this request is being rejected..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="mt-2"
          />
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
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Rejecting...' : 'Reject Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
