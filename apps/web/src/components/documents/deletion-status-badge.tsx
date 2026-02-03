'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, AlertTriangle, CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import { useDeletionStatus, type DeletionStatus } from '@/hooks/use-deletion-status';
import { useDeletionCountdown } from '@/hooks/use-deletion-countdown';
import { api } from '@/lib/api';

interface DeletionStatusBadgeProps {
  documentId: string;
  expiresAt: Date | null;
  /**
   * Optional externally provided status/loading to avoid duplicate API calls.
   * When not provided, this component will fetch status internally.
   */
  status?: DeletionStatus | null;
  loading?: boolean;
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

export function DeletionStatusBadge({
  documentId,
  expiresAt,
  status: externalStatus,
  loading: externalLoading,
}: DeletionStatusBadgeProps) {
  // If status/loading are not provided, fall back to internal hook.
  // This keeps the component reusable while allowing callers to share status.
  const shouldUseInternalHook =
    typeof externalStatus === 'undefined' || typeof externalLoading === 'undefined';

  const {
    status: internalStatus,
    loading: internalLoading,
  } = useDeletionStatus(shouldUseInternalHook ? documentId : '');

  const status = shouldUseInternalHook ? internalStatus : externalStatus ?? null;
  const loading = shouldUseInternalHook ? internalLoading : !!externalLoading;

  const countdown = useDeletionCountdown(expiresAt);
  const [rejectionRequest, setRejectionRequest] = useState<DeletionRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch deletion request only for expired documents without active requests.
  // This avoids spamming the API for documents that were never part of the workflow.
  useEffect(() => {
    if (!status || !status.isExpired || status.hasActiveRequest) {
      setRejectionRequest(null);
      return;
    }

    const fetchRequest = async () => {
      try {
        const request = await api.get<DeletionRequest | null>(
          `/storage/documents/${documentId}/deletion-request`,
        );
        if (request && request.status === 'REJECTED') {
          setRejectionRequest(request);
        } else {
          setRejectionRequest(null);
        }
      } catch {
        // Request might not exist – that's fine, just clear state
        setRejectionRequest(null);
      }
    };

    fetchRequest();
  }, [documentId, status]);

  if (loading || !status) {
    return (
      <Badge variant="outline" className="gap-1 animate-pulse">
        <div className="h-3 w-3 rounded-full bg-muted" />
        <div className="h-3 w-16 bg-muted rounded" />
      </Badge>
    );
  }

  // Can delete (within 72h)
  if (status.canDelete && !countdown.isExpired) {
    const getUrgencyLevel = (hours: number) => {
      if (hours < 1) return { class: 'text-red-600', pulse: true };
      if (hours < 6) return { class: 'text-orange-600', pulse: true };
      if (hours < 12) return { class: 'text-orange-600', pulse: false };
      return { class: 'text-green-600', pulse: false };
    };

    const urgency = getUrgencyLevel(countdown.hours);

    return (
      <Badge
        variant="success"
        className={`gap-1 ${urgency.pulse ? 'animate-pulse' : ''}`}
      >
        <CheckCircle className="h-3 w-3" />
        Can Delete
        <span className={urgency.class}>
          ({countdown.hours}h {countdown.minutes}m left)
        </span>
      </Badge>
    );
  }

  // Request pending
  if (status.hasActiveRequest) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending DCC Review
      </Badge>
    );
  }

  // Request rejected - show with clickable badge that opens dialog
  // IMPORTANT: Check rejection BEFORE "Requires DCC Approval" to ensure
  // rejected requests are shown even when document is expired
  if (rejectionRequest && rejectionRequest.status === 'REJECTED') {
    return (
      <>
        <Badge
          variant="destructive"
          className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setDialogOpen(true)}
        >
          <XCircle className="h-3 w-3" />
          Rejected
          {rejectionRequest.reviewerComment && ' (Click for details)'}
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
  // Show this only if there's no rejected request (rejection check comes first)
  if (status.requiresDCCApproval && !status.hasActiveRequest) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Requires DCC Approval
      </Badge>
    );
  }

  // No permission
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      No Permission
    </Badge>
  );
}
