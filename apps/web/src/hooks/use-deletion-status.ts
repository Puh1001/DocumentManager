'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useFolderSync } from './use-folder-sync';

interface SyncEvent {
  type:
    | 'folder_added'
    | 'folder_updated'
    | 'folder_deleted'
    | 'document_added'
    | 'document_updated'
    | 'document_deleted'
    | 'deletion_request_rejected'
    | 'deletion_request_approved'
    | 'sync_completed';
  folderId?: string;
  documentId?: string;
  data?: unknown;
}

export interface DeletionStatus {
  canDelete: boolean;
  isExpired: boolean;
  remainingHours: number;
  requiresDCCApproval: boolean;
  hasActiveRequest: boolean;
  requestId?: string;
}

export function useDeletionStatus(documentId: string) {
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const documentIdRef = useRef(documentId);

  // Update ref when documentId changes
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  const fetchStatus = useCallback(async () => {
    const currentDocumentId = documentIdRef.current;
    if (!currentDocumentId) return;

    try {
      setLoading(true);
      const response = await api.get<DeletionStatus>(
        `/storage/documents/${currentDocumentId}/deletion-status`,
      );
      setStatus(response);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to WebSocket events for real-time updates
  const handleSyncEvent = useCallback(
    (event: SyncEvent) => {
      // Refresh deletion status when document is updated, deleted, or deletion request status changes
      if (
        event.documentId === documentIdRef.current &&
        (event.type === 'document_updated' ||
          event.type === 'document_deleted' ||
          event.type === 'deletion_request_rejected' ||
          event.type === 'deletion_request_approved')
      ) {
        fetchStatus();
      }
    },
    [fetchStatus],
  );

  useFolderSync({
    onSyncEvent: handleSyncEvent,
    enabled: !!documentId,
  });

  useEffect(() => {
    if (documentId) {
      fetchStatus();
    }
  }, [documentId, fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
