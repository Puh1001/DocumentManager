'use client';

import { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, AlertTriangle, CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import { useKpiAttachmentDeletionStatus } from '@/hooks/use-kpi-attachment-deletion-status';
import { useDeletionCountdown } from '@/hooks/use-deletion-countdown';
import { kpiAttachmentApi } from '@/lib/api';

interface KpiAttachmentDeletionBadgeProps {
  attachmentId: string;
  documentId: string;
  expiresAt?: Date | null;
  variant?: 'default' | 'cyber';
}

interface DeletionRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  requestedAt?: string;
  reviewerComment?: string | null;
  reviewer?: {
    id: string;
    fullName: string;
    username?: string;
  } | null;
  reviewedAt?: string | null;
  requester?: {
    id: string;
    fullName: string;
  } | null;
}

export function KpiAttachmentDeletionBadge({
  attachmentId,
  documentId: _documentId,
  expiresAt: propExpiresAt,
  variant = 'default',
}: KpiAttachmentDeletionBadgeProps) {
  const { status, loading } = useKpiAttachmentDeletionStatus(attachmentId);
  const [rejectionRequest, setRejectionRequest] = useState<DeletionRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Use expiresAt from props (document data) if available, otherwise calculate from remainingHours
  // This matches the Documents list behavior
  const expiresAt = useMemo(() => {
    // Priority 1: Use expiresAt from document data (like Documents list)
    if (propExpiresAt) {
      return propExpiresAt;
    }
    
    // Priority 2: Calculate from remainingHours if status available
    if (!status) return null;
    if (status.canDelete && !status.isExpired && status.remainingHours !== Infinity) {
      // If remainingHours is 0, we still have some time left (less than 1 hour)
      const hoursToAdd = status.remainingHours > 0 ? status.remainingHours : 0.016; // 0.016 hours = ~1 minute
      return new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propExpiresAt, status?.remainingHours, status?.canDelete, status?.isExpired]);
  
  const countdown = useDeletionCountdown(expiresAt);

  // Fetch deletion request if status indicates there was a request
  useEffect(() => {
    if (!status || !status.hasActiveRequest) {
      // Check if there's a rejected request
      const fetchRequest = async () => {
        try {
          const request = await kpiAttachmentApi.getDeletionRequest(attachmentId);
          if (request && request.status === 'REJECTED') {
            setRejectionRequest(request);
          } else {
            setRejectionRequest(null);
          }
        } catch (error) {
          // Request might not exist, that's okay
          setRejectionRequest(null);
        }
      };
      fetchRequest();
    } else {
      setRejectionRequest(null);
    }
  }, [attachmentId, status]);

  if (loading || !status) {
    return (
      <Badge variant="outline" className="gap-1 animate-pulse">
        <div className="h-3 w-3 rounded-full bg-muted" />
        <div className="h-3 w-16 bg-muted rounded" />
      </Badge>
    );
  }

  // Can delete (within 72h) - prioritize backend status.canDelete
  // Use countdown from expiresAt (like Documents list) if available, otherwise fallback to remainingHours
  if (status.canDelete && !countdown.isExpired) {
    const getUrgencyLevel = (hours: number) => {
      if (hours < 1) return { class: 'text-red-600', pulse: true };
      if (hours < 6) return { class: 'text-orange-600', pulse: true };
      if (hours < 12) return { class: 'text-orange-600', pulse: false };
      return { class: 'text-green-600', pulse: false };
    };

    // Use countdown from expiresAt (matches Documents list behavior)
    // Fallback to remainingHours only if expiresAt is not available
    let displayHours: number;
    let displayMinutes: number;
    
    if (expiresAt && !countdown.isExpired) {
      // Use countdown values from expiresAt (most accurate)
      displayHours = countdown.hours ?? 0;
      displayMinutes = countdown.minutes ?? 0;
    } else {
      // Fallback to backend remainingHours
      displayHours = typeof status.remainingHours === 'number' && !isNaN(status.remainingHours)
        ? status.remainingHours
        : 0;
      displayMinutes = 0;
    }

    const urgency = getUrgencyLevel(displayHours);

    const badgeClass = variant === 'cyber'
      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
      : '';

    return (
      <Badge
        variant="success"
        className={`gap-1 ${urgency.pulse ? 'animate-pulse' : ''} ${badgeClass}`}
      >
        <CheckCircle className="h-3 w-3" />
        <span className="text-xs">
          Can Delete
          <span className={urgency.class}>
            {' '}({displayHours}h {displayMinutes}m left)
          </span>
        </span>
      </Badge>
    );
  }

  // Request pending
  if (status.hasActiveRequest) {
    const badgeClass = variant === 'cyber'
      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
      : '';

    return (
      <Badge variant="secondary" className={`gap-1 ${badgeClass}`}>
        <Clock className="h-3 w-3" />
        <span className="text-xs">Pending DCC Review</span>
      </Badge>
    );
  }

  // Request rejected - show with clickable badge that opens dialog
  // IMPORTANT: Check rejection BEFORE "Expired" to ensure
  // rejected requests are shown even when document is expired
  if (rejectionRequest && rejectionRequest.status === 'REJECTED') {
    const badgeClass = variant === 'cyber'
      ? 'bg-red-500/10 border-red-500/30 text-red-300'
      : '';

    return (
      <>
        <Badge
          variant="destructive"
          className={`gap-1 cursor-pointer hover:opacity-80 transition-opacity ${badgeClass}`}
          onClick={() => setDialogOpen(true)}
        >
          <XCircle className="h-3 w-3" />
          <span className="text-xs">
            Rejected
            {rejectionRequest.reviewerComment && ' (Click for details)'}
          </span>
        </Badge>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Deletion Request Rejected
              </DialogTitle>
              <DialogDescription>
                Your deletion request has been rejected by DCC
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {rejectionRequest.reason && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Your Request Reason:</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {rejectionRequest.reason}
                  </p>
                </div>
              )}

              {rejectionRequest.reviewerComment ? (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-destructive">
                    Rejection Reason:
                  </h4>
                  <p className="text-sm text-foreground bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                    {rejectionRequest.reviewerComment}
                  </p>
                </div>
              ) : (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground italic">
                    No rejection reason provided by reviewer.
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm border-t pt-4">
                {rejectionRequest.requester && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested by:</span>
                    <span className="font-medium">
                      {rejectionRequest.requester.fullName}
                    </span>
                  </div>
                )}

                {rejectionRequest.requestedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested on:</span>
                    <span className="font-medium">
                      {new Date(rejectionRequest.requestedAt).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {rejectionRequest.reviewer && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Reviewed by:</span>
                    <span className="font-medium">
                      {rejectionRequest.reviewer.fullName}
                    </span>
                  </div>
                )}

                {rejectionRequest.reviewedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Reviewed on:</span>
                    <span className="font-medium">
                      {new Date(rejectionRequest.reviewedAt).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Expired - requires DCC approval
  // Show expired if:
  // 1. Backend says requiresDCCApproval OR isExpired
  // 2. OR frontend countdown is expired (matches Documents list behavior)
  // Don't show if there's an active request or rejected request (rejection check comes first)
  // Don't show in bossUI (variant === 'cyber')
  if (!status.hasActiveRequest && (
    status.requiresDCCApproval || 
    status.isExpired || 
    countdown.isExpired
  )) {
    // Hide "Expired - Contact DCC" badge in bossUI
    if (variant === 'cyber') {
      return null;
    }

    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        <span className="text-xs">Expired - Contact DCC</span>
      </Badge>
    );
  }

  // No permission
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      <span className="text-xs">No Permission</span>
    </Badge>
  );
}
