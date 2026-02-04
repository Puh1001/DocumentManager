"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { getUserDepartments } from "@/lib/kpi-access-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { UploadProgress } from "@/components/documents/upload-progress";
import { FolderPickerDialog } from "@/components/documents/folder-picker-dialog";
import { Card } from "@/components/ui/card";
import { useFolderSync } from "@/hooks/use-folder-sync";
import { useDocumentLevels } from "@/hooks/use-document-levels";
import type { Document } from "@/lib/types/document.types";

interface UploadProgress {
  percentage: number;
  speed: number;
  eta: number;
}

// Custom debounce hook
function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

function canSeeAllFolders(roles: string[]): boolean {
  return roles.some((r) => r === "admin" || r === "dcc" || r === "boss");
}

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const locale = useLocale();
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadAbortController, setUploadAbortController] = useState<{
    abort: () => void;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [departments, setDepartments] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const { levels, loading: levelsLoading } = useDocumentLevels();

  // Departments allowed for upload: everyone (including admin) must select one; upload goes to Documents folder of that department
  const uploadDepartments = useMemo(() => {
    if (!user || !departments.length) return [];
    if (canSeeAllFolders(user.roles || [])) return departments;
    const ids = getUserDepartments(user);
    return departments.filter((d) => ids.includes(d.id));
  }, [user, departments]);

  const [selectedDepartmentIdForUpload, setSelectedDepartmentIdForUpload] =
    useState<string>("");

  useEffect(() => {
    if (uploadDepartments.length === 0) {
      setSelectedDepartmentIdForUpload("");
      return;
    }
    setSelectedDepartmentIdForUpload((prev) => {
      const inList = uploadDepartments.some((d) => d.id === prev);
      return inList ? prev : (uploadDepartments[0]?.id ?? "");
    });
  }, [uploadDepartments]);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);

  useEffect(() => {
    api
      .get<{ id: string; name: string; code: string }[]>("/departments")
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  const loadAllDocuments = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        console.log("[Documents] Loading documents", {
          requestedPage: page,
          statusFilter,
          departmentFilter,
          levelFilter,
        });
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (
          statusFilter === "ACTIVE" ||
          statusFilter === "ARCHIVED" ||
          statusFilter === "DELETED"
        ) {
          params.append("status", statusFilter);
        }
        if (departmentFilter) {
          params.append("departmentId", departmentFilter);
        }
        if (levelFilter) {
          params.append("level", levelFilter);
        }

        const response = await api.get<{
          data: Document[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>(`/storage/documents?${params.toString()}`);

        // Dedupe by id so the same document never appears twice (defense in depth)
        const list = response.data || [];
        const seenIds = new Set<string>();
        const deduped = list.filter((d) => {
          if (seenIds.has(d.id)) return false;
          seenIds.add(d.id);
          return true;
        });
        setDocuments(deduped);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        // Ensure currentPage reflects the latest successful response
        if (typeof response.page === "number") {
          setCurrentPage((prev) =>
            prev === response.page ? prev : response.page
          );
        }
        if (response.page && response.page !== page) {
          // Log mismatch for debugging; backend and frontend should agree on page
          console.warn(
            "[Documents] Page mismatch between request and response",
            {
              requestedPage: page,
              responsePage: response.page,
            }
          );
        }
        // Don't update currentPage here - it's managed by the caller
        // This prevents circular dependency in useEffect
      } catch (error) {
        console.error("Failed to load documents:", error);
        toast({
          title: t("errors.loadFailed") || "Error",
          description:
            t("errors.loadFailedDescription") ||
            "Failed to load documents. Please try again.",
          variant: "destructive",
        });
        setDocuments([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, departmentFilter, levelFilter, limit, toast, t]
  );

  const debouncedLoadDocuments = useDebounce(() => {
    // Reset to page 1 when filters change - this will trigger the page effect below
    setCurrentPage(1);
  }, 300);

  useEffect(() => {
    console.log("[Documents] currentPage state changed", currentPage);
  }, [currentPage]);

  useEffect(() => {
    debouncedLoadDocuments();
    // We intentionally omit debouncedLoadDocuments from deps to avoid
    // resetting the page on every render due to function identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, departmentFilter, levelFilter]);

  // Load documents when page changes (without debounce)
  // Only depend on currentPage - loadAllDocuments is stable (doesn't change unless filters change)
  useEffect(() => {
    loadAllDocuments(currentPage);
  }, [currentPage, loadAllDocuments]);

  // Real-time sync with WebSocket
  const handleSyncEvent = useCallback(
    (event: {
      type: string;
      folderId?: string;
      documentId?: string;
      data?: unknown;
    }) => {
      // Handle sync_completed event specifically
      if (event.type === "sync_completed") {
        const data = event.data as
          | { success?: boolean; error?: string }
          | undefined;
        if (data?.success === false) {
          console.error("Sync failed:", data.error);
        } else {
          console.log("Sync completed successfully");
        }
        // Refresh document list but keep current page to avoid unexpected jumps
        loadAllDocuments(currentPage);
        // Refresh deleted count
        api
          .get<{ total: number }>(
            "/storage/documents?status=DELETED&limit=1&page=1"
          )
          .then((res) => setDeletedCount(res.total || 0))
          .catch(() => setDeletedCount(0));
        return;
      }

      // Refresh document list on any sync event (keep current page)
      if (
        event.type === "folder_added" ||
        event.type === "folder_updated" ||
        event.type === "folder_deleted" ||
        event.type === "document_added" ||
        event.type === "document_updated" ||
        event.type === "document_deleted"
      ) {
        loadAllDocuments(currentPage);
        // Refresh deleted count
        api
          .get<{ total: number }>(
            "/storage/documents?status=DELETED&limit=1&page=1"
          )
          .then((res) => setDeletedCount(res.total || 0))
          .catch(() => setDeletedCount(0));
      }
    },
    [loadAllDocuments, currentPage]
  );

  useFolderSync({
    onSyncEvent: handleSyncEvent,
    enabled: true,
  });

  const handleDocumentDeleted = useCallback(
    (documentId: string) => {
      // Remove deleted document from list
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      // Refresh to ensure consistency (keep current page)
      loadAllDocuments(currentPage);
    },
    [loadAllDocuments, currentPage]
  );

  const handleFolderSelected = (folderId: string, levelId: string) => {
    if (!levelId?.trim()) return;
    if (pendingUploadFile) {
      performUpload(pendingUploadFile, folderId, levelId);
      setPendingUploadFile(null);
    }
  };

  const handleFileSelect = (file: File) => {
    if (uploadDepartments.length === 0) {
      toast({
        title: t("errors.loadFailed") || "Error",
        description:
          t("upload.noDepartment") ||
          "No department available for upload. Please contact admin.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedDepartmentIdForUpload) {
      setSelectedDepartmentIdForUpload(uploadDepartments[0]?.id ?? "");
    }
    setPendingUploadFile(file);
    setFolderPickerOpen(true);
  };

  const performUpload = async (
    file: File,
    folderId: string,
    levelId: string
  ) => {
    if (!levelId?.trim()) return;
    setUploading(true);
    setUploadFileName(file.name);
    setUploadProgress({ percentage: 0, speed: 0, eta: 0 });

    const body: Record<string, string> = { folderId, levelId };

    const { promise, abort } = api.uploadWithProgress(
      "/storage/documents/upload",
      file,
      body,
      (progress) => {
        setUploadProgress({
          percentage: progress.percentage,
          speed: progress.speed,
          eta: progress.eta,
        });
      }
    );

    setUploadAbortController({ abort } as AbortController);

    try {
      await promise;
      setUploading(false);
      setUploadProgress(null);
      setUploadFileName("");
      // Refresh and reset to page 1 after upload
      setCurrentPage(1);
      loadAllDocuments(1);
      toast({
        title: t("toolbar.uploadSuccess") || "Success",
        description:
          t("toolbar.uploadSuccessDescription") ||
          "Document uploaded successfully",
      });
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
      setUploadProgress(null);
      setUploadFileName("");
      if (error instanceof Error && error.message !== "Upload cancelled") {
        toast({
          title: t("toolbar.uploadError") || "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortController && "abort" in uploadAbortController) {
      (uploadAbortController as { abort: () => void }).abort();
    }
    setUploading(false);
    setUploadProgress(null);
    setUploadFileName("");
    setUploadAbortController(null);
  };

  const handleSync = async () => {
    try {
      // Start sync - it will return immediately
      // We'll listen to sync_completed event via WebSocket to refresh UI
      await api.post("/storage/folders/sync");
      // Don't refresh here - wait for sync_completed event
      // The handleSyncEvent callback will handle refresh when sync_completed is received
    } catch (error) {
      console.error("Failed to start sync:", error);
      throw error; // Re-throw to let toolbar handle loading state
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 min-w-0">
              <DocumentToolbar
                statusFilter={statusFilter}
                departmentFilter={departmentFilter}
                levelFilter={levelFilter}
                onStatusChange={setStatusFilter}
                onDepartmentChange={setDepartmentFilter}
                onLevelChange={setLevelFilter}
                departments={departments}
                levels={levels}
                levelsLoading={levelsLoading}
                locale={locale}
                onUpload={handleFileSelect}
                onRefresh={() => loadAllDocuments(currentPage)}
                onSync={handleSync}
                uploadDepartments={uploadDepartments}
                selectedDepartmentIdForUpload={selectedDepartmentIdForUpload}
                onUploadDepartmentChange={setSelectedDepartmentIdForUpload}
              />
            </div>
            {deletedCount > 0 && (
              <div className="lg:pt-6 lg:pl-3 lg:shrink-0">
                <Badge
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => {
                    setStatusFilter("DELETED");
                    setCurrentPage(1);
                  }}
                >
                  {t("filters.statusDeleted")}: {deletedCount}
                </Badge>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <DocumentList
            documents={documents}
            locale={locale}
            onDocumentClick={(doc) => {
              // Open document viewer with locale
              window.open(
                `/${locale}/dashboard/documents/${doc.id}/view`,
                "_blank"
              );
            }}
            onDocumentDeleted={handleDocumentDeleted}
            onDocumentMetadataUpdated={() => {
              // Refresh document list after ISO metadata edit
              loadAllDocuments(currentPage);
            }}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t("pagination.showing", {
                  from: (currentPage - 1) * limit + 1,
                  to: Math.min(currentPage * limit, total),
                  total,
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Folder Picker Dialog: use effective department when open so we never pass empty (avoids "No folders available" race) */}
      <FolderPickerDialog
        open={folderPickerOpen}
        onOpenChange={(open) => {
          setFolderPickerOpen(open);
          if (!open) {
            setPendingUploadFile(null);
          }
        }}
        onSelect={handleFolderSelected}
        departmentId={
          folderPickerOpen
            ? selectedDepartmentIdForUpload ||
              uploadDepartments[0]?.id ||
              undefined
            : undefined
        }
        documentsOnly
      />

      {/* Upload Progress Dialog */}
      {uploading && uploadProgress && (
        <UploadProgress
          open={uploading}
          fileName={uploadFileName}
          percentage={uploadProgress.percentage}
          speed={uploadProgress.speed}
          eta={uploadProgress.eta}
          onCancel={handleCancelUpload}
        />
      )}
    </div>
  );
}
