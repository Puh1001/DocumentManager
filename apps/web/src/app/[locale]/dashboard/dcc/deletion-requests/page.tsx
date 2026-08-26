'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { RejectDialog } from '@/components/dcc/reject-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useFolderSync } from '@/hooks/use-folder-sync';
import type { PageMetadata } from '@/lib/types/page-metadata';
import { registerPage } from '@/lib/page-registry';
import { fixFileNameEncoding } from '@/lib/utils/encoding-fix';
import * as Tabs from '@radix-ui/react-tabs';

export const pageMetadata: PageMetadata = {
  path: '/dashboard/dcc/deletion-requests',
  name: 'Deletion Request',
  module: 'Document',
  action: 'manage',
  icon: 'FileCheck',
  order: 8,
  requiresAuth: true,
};

// Register page metadata
registerPage(pageMetadata);

interface DeletionRequest {
  id: string;
  document: {
    id: string;
    name: string;
    fileName: string;
    folder: { name: string };
  };
  requester: {
    id: string;
    fullName: string;
    username: string;
  };
  requestedAt: string;
  reason: string;
  replacementFile?: {
    id: string;
    name: string;
  } | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerComment?: string | null;
  reviewedBy?: {
    id: string;
    fullName: string;
    username: string;
  } | null;
  reviewedAt?: string | null;
}

export default function DeletionRequestsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(
    null,
  );
  const [approving, setApproving] = useState(false);
  
  const [type, setType] = useState<'ISO' | 'KPI'>('ISO');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [cache, setCache] = useState<Record<string, { requests: DeletionRequest[]; totalPages: number; totalCount: number }>>({});

  // Calculate current cache key
  const currentCacheKey = `${type}-${page}-${search}`;
  const cachedData = cache[currentCacheKey];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset to page 1 on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchRequests = useCallback(async (force = false) => {
    // If we have cached data and not forcing a refresh, just return (no loading state needed)
    if (!force && cache[`${type}-${page}-${search}`]) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<{ data: DeletionRequest[]; meta: { totalPages: number; total: number } }>(
        `/storage/deletion-requests?type=${type}&search=${encodeURIComponent(search)}&page=${page}&limit=10`,
      );
      
      setCache((prev) => ({
        ...prev,
        [`${type}-${page}-${search}`]: {
          requests: response.data,
          totalPages: response.meta.totalPages,
          totalCount: response.meta.total,
        }
      }));
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description:
          apiError.response?.data?.message ||
          apiError.message ||
          'Failed to load deletion requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, type, search, page, cache]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]); // Re-run when these change

  // Listen to WebSocket events for real-time updates
  useFolderSync({
    onSyncEvent: (event) => {
      // Refresh requests when documents are deleted (approved deletion) or request status changes
      if (
        event.type === 'document_deleted' ||
        event.type === 'deletion_request_rejected' ||
        event.type === 'deletion_request_approved'
      ) {
        fetchRequests(true);
      }
    },
    enabled: true,
  });

  const handleApproveClick = (requestId: string) => {
    setApprovingRequestId(requestId);
    setShowApproveConfirm(true);
  };

  const handleApprove = async () => {
    if (!approvingRequestId) return;

    setApproving(true);
    try {
      await api.post(`/storage/deletion-requests/${approvingRequestId}/review`, {
        approve: true,
      });
      toast({
        title: 'Success',
        description: 'Request approved and document deleted',
        variant: 'success',
      });
      fetchRequests(true);
      setShowApproveConfirm(false);
      setApprovingRequestId(null);
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description:
          apiError.response?.data?.message ||
          apiError.message ||
          'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectDialogOpen(true);
  };

  const handleRejectSubmitted = () => {
    setRejectDialogOpen(false);
    setSelectedRequestId(null);
    toast({
      title: 'Success',
      description: 'Request rejected',
      variant: 'success',
    });
    fetchRequests(true);
  };

  const currentRequests = cachedData?.requests || [];
  const currentTotalPages = cachedData?.totalPages || 1;
  const currentTotalCount = cachedData?.totalCount || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold">Deletion Requests</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve/reject document deletion requests
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by file or requester..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <Tabs.Root
        value={type}
        onValueChange={(v) => {
          setType(v as 'ISO' | 'KPI');
          setPage(1);
        }}
      >
        <Tabs.List className="flex space-x-4 border-b mb-6">
          <Tabs.Trigger
            value="ISO"
            className="px-4 py-2 border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-transparent font-medium transition-all"
          >
            ISO Documents
          </Tabs.Trigger>
          <Tabs.Trigger
            value="KPI"
            className="px-4 py-2 border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-transparent font-medium transition-all"
          >
            KPI Attachments
          </Tabs.Trigger>
        </Tabs.List>

      {loading && !cachedData ? (
        <div className="py-12 flex justify-center text-muted-foreground">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : currentRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending deletion requests
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {request.document.name}
                    </CardTitle>
                    <CardDescription>
                      {fixFileNameEncoding(request.document.fileName)}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Pending Review</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested by:</span>
                    <span className="font-medium">
                      {request.requester.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Reason:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {request.reason}
                  </p>
                </div>

                {request.replacementFile && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Replacement file:
                        </span>
                      </div>
                      <a
                        href={`/documents/${request.replacementFile.id}`}
                        className="text-sm text-primary hover:underline pl-6"
                      >
                        {request.replacementFile.name}
                      </a>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApproveClick(request.id)}
                    className="gap-1"
                    aria-label={`Approve deletion request for ${request.document.name}`}
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                    className="gap-1"
                    aria-label={`Reject deletion request for ${request.document.name}`}
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {currentTotalPages > 1 && (
        <div className="flex justify-end items-center space-x-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {currentTotalPages} ({currentTotalCount} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(currentTotalPages, p + 1))}
            disabled={page === currentTotalPages}
          >
            Next
          </Button>
        </div>
      )}
      </Tabs.Root>

      {selectedRequestId && (
        <RejectDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          requestId={selectedRequestId}
          onSubmitted={handleRejectSubmitted}
        />
      )}

      <ConfirmDialog
        open={showApproveConfirm}
        onOpenChange={setShowApproveConfirm}
        title="Approve Deletion Request"
        description="Are you sure you want to approve this deletion request? The document will be permanently deleted."
        onConfirm={handleApprove}
        confirmLabel="Approve"
        variant="default"
        loading={approving}
      />
    </div>
  );
}
