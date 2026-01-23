'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { kpiAttachmentApi } from '@/lib/api';
import type { DeletionStatus } from '@/lib/api';

export function useKpiAttachmentDeletionStatus(attachmentId: string) {
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const attachmentIdRef = useRef(attachmentId);

  // Update ref when attachmentId changes
  useEffect(() => {
    attachmentIdRef.current = attachmentId;
  }, [attachmentId]);

  const fetchStatus = useCallback(async () => {
    const currentAttachmentId = attachmentIdRef.current;
    if (!currentAttachmentId) return;

    try {
      setLoading(true);
      const response = await kpiAttachmentApi.getDeletionStatus(currentAttachmentId);
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

  useEffect(() => {
    if (attachmentId) {
      fetchStatus();
    }
  }, [attachmentId, fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
