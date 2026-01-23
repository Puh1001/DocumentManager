'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Clock } from 'lucide-react';
import { useDeletionStatus } from '@/hooks/use-deletion-status';
import { DeletionRequestDialog } from './deletion-request-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DeletionActionsProps {
  documentId: string;
  documentName: string;
  onDeleted?: () => void;
}

export function DeletionActions({
  documentId,
  documentName,
  onDeleted,
}: DeletionActionsProps) {
  const { status, loading, refetch } = useDeletionStatus(documentId);
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(`Are you sure you want to delete "${documentName}"?`)
    ) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/storage/documents/${documentId}`);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
        variant: 'success',
      });
      onDeleted?.();
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description:
          apiError.response?.data?.message ||
          apiError.message ||
          'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRequestSubmitted = () => {
    setShowRequestDialog(false);
    refetch();
    toast({
      title: 'Success',
      description: 'Deletion request submitted to DCC',
      variant: 'success',
    });
  };

  if (loading || !status) return null;

  // Can self-delete
  if (status.canDelete) {
    return (
      <>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirmDialog(true)}
          disabled={deleting}
          className="gap-1"
          aria-label={`Delete ${documentName}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          title="Delete Document"
          description={`Are you sure you want to delete "${documentName}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          confirmLabel="Delete"
          variant="destructive"
          loading={deleting}
        />
      </>
    );
  }

  // Can submit request
  if (status.requiresDCCApproval && !status.hasActiveRequest) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRequestDialog(true)}
          className="gap-1"
          aria-label={`Request deletion for ${documentName}`}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Request Deletion
        </Button>

        <DeletionRequestDialog
          open={showRequestDialog}
          onOpenChange={setShowRequestDialog}
          documentId={documentId}
          documentName={documentName}
          onSubmitted={handleRequestSubmitted}
        />
      </>
    );
  }

  // Request already pending
  if (status.hasActiveRequest) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-1"
        aria-label={`Deletion request for ${documentName} is pending review`}
      >
        <Clock className="h-4 w-4" aria-hidden="true" />
        Pending Review
      </Button>
    );
  }

  return null;
}
