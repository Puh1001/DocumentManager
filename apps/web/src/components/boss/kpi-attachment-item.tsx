'use client';

import { FileText, X, Pencil } from 'lucide-react';
import { KpiAttachment, kpiAttachmentApi } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { KpiAttachmentDeletionBadge } from './kpi-attachment-deletion-badge';
import { KpiAttachmentRenameDialog } from './kpi-attachment-rename-dialog';
import { fixFileNameEncoding } from '@/lib/utils/encoding-fix';
import { useKpiAttachmentDeletionStatus } from '@/hooks/use-kpi-attachment-deletion-status';
import { useState } from 'react';

interface KpiAttachmentItemProps {
  attachment: KpiAttachment;
  onAttachmentClick: (attachmentId: string) => void;
  onAttachmentDelete?: (attachmentId: string) => void;
  onDeletionRequest?: (attachment: KpiAttachment) => void;
  onAttachmentRenamed?: (attachmentId: string) => void;
  canDelete: boolean;
  canEdit?: boolean;
  variant?: 'default' | 'cyber';
}

export function KpiAttachmentItem({
  attachment,
  onAttachmentClick,
  onAttachmentDelete,
  onDeletionRequest,
  onAttachmentRenamed,
  canDelete,
  canEdit = false,
  variant = 'default',
}: KpiAttachmentItemProps) {
  const t = useTranslations('boss.kpi.attachments');
  const { toast } = useToast();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  
  // Check deletion status to determine if delete button should be visible
  const { status: deletionStatus } = useKpiAttachmentDeletionStatus(attachment.id);
  
  // Determine if delete button should be visible
  // Button should only be visible if:
  // 1. User has permission (canDelete prop)
  // 2. Backend says user can delete and file is not expired
  const canShowDeleteButton = canDelete && 
    onAttachmentDelete && 
    deletionStatus && 
    deletionStatus.canDelete && 
    !deletionStatus.isExpired;

  const containerClass =
    variant === 'cyber'
      ? 'group relative flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all text-xs font-cyber text-cyan-300 cyber-text-glow'
      : 'group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted border border-border rounded-md hover:bg-accent hover:border-accent-foreground/20 transition-all text-xs';

  const buttonClass =
    variant === 'cyber'
      ? 'flex items-center gap-1.5 flex-1 min-w-0'
      : 'flex items-center gap-1.5 flex-1 min-w-0 text-muted-foreground hover:text-foreground';

  const fileNameClass =
    variant === 'cyber'
      ? 'max-w-[120px] truncate'
      : 'max-w-[140px] truncate font-medium';

  // Fix filename encoding for display (client-side fallback)
  const displayFileName = fixFileNameEncoding(attachment.fileName);

  const deleteButtonClass =
    variant === 'cyber'
      ? 'ml-1 p-0.5 hover:bg-red-500/20 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100'
      : 'ml-1 p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100';

  const deleteIconClass =
    variant === 'cyber'
      ? 'h-3 w-3 text-red-400 hover:text-red-300'
      : 'h-3.5 w-3.5 text-destructive hover:text-destructive/80';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!onAttachmentDelete) return;

    // Always refetch status to ensure backend validation (defense in depth)
    try {
      const currentStatus = await kpiAttachmentApi.getDeletionStatus(attachment.id);
      
      // Check both backend status and frontend countdown
      const isExpired = currentStatus.isExpired || !currentStatus.canDelete;
      
      if (isExpired) {
        // Show deletion request dialog if expired
        if (onDeletionRequest) {
          onDeletionRequest(attachment);
          return;
        } else {
          toast({
            title: 'Error',
            description: t('errors.noPermission') || 'You do not have permission to delete this attachment',
            variant: 'destructive',
          });
          return;
        }
      }

      // Within 72 hours - proceed with deletion
      if (confirm(t('deleteConfirm') || 'Bạn có chắc muốn xóa file này?')) {
        onAttachmentDelete(attachment.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : t('errors.checkStatusFailed') || 'Failed to check deletion status';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className={containerClass}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAttachmentClick(attachment.id);
          }}
          className={buttonClass}
          title={displayFileName}
          aria-label={`${t('viewer.title')}: ${displayFileName}`}
        >
          <FileText
            className={`${variant === 'cyber' ? 'h-3 w-3' : 'h-3.5 w-3.5'} flex-shrink-0`}
          />
          <span className={fileNameClass}>{displayFileName}</span>
        </button>
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRenameDialogOpen(true);
            }}
            className={deleteButtonClass}
            title={t('rename') || 'Đổi tên file'}
            aria-label={t('rename') || 'Đổi tên file'}
          >
            <Pencil className={deleteIconClass} />
          </button>
        )}
        {canShowDeleteButton && (
          <button
            onClick={handleDelete}
            className={deleteButtonClass}
            title={t('delete') || 'Xóa file'}
            aria-label={t('delete') || 'Xóa file'}
          >
            <X className={deleteIconClass} />
          </button>
        )}
      </div>
      {/* Deletion status badge */}
      <KpiAttachmentDeletionBadge
        attachmentId={attachment.id}
        documentId={attachment.documentId}
        expiresAt={
          attachment.deletionExpiresAt
            ? new Date(attachment.deletionExpiresAt)
            : null
        }
        variant={variant}
      />

      {/* Rename Dialog */}
      <KpiAttachmentRenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        attachmentId={attachment.id}
        currentFileName={attachment.fileName}
        onRenamed={() => {
          onAttachmentRenamed?.(attachment.id);
        }}
      />
    </div>
  );
}
