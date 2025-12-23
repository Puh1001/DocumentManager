"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { FolderTree } from "@/components/documents/folder-tree";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { UploadProgress } from "@/components/documents/upload-progress";
import { Card } from "@/components/ui/card";
import { useFolderSync } from "@/hooks/use-folder-sync";

interface Folder {
  id: string;
  name: string;
  path: string;
  physicalLocation: string | null;
  children: Folder[];
  documents?: Document[];
}

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  updatedAt: string;
}

interface UploadProgress {
  percentage: number;
  speed: number;
  eta: number;
}

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadAbortController, setUploadAbortController] = useState<{
    abort: () => void;
  } | null>(null);

  const loadFolderTree = useCallback(async () => {
    try {
      const tree = await api.get<Folder[]>("/storage/folders/tree");
      setFolders(tree || []);

      // If no folders, try to sync with file system
      if (!tree || tree.length === 0) {
        console.warn("No folders found. Consider running sync.");
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolderContents = useCallback(async (folderId: string) => {
    try {
      const folder = await api.get<Folder>(`/storage/folders/${folderId}`);
      setSelectedFolder(folder);
      setDocuments(folder.documents || []);
    } catch (error) {
      console.error("Failed to load folder contents:", error);
    }
  }, []);

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  useEffect(() => {
    if (selectedFolderId) {
      loadFolderContents(selectedFolderId);
    }
  }, [selectedFolderId, loadFolderContents]);

  // Real-time sync with WebSocket
  const handleSyncEvent = useCallback(
    (event: {
      type: string;
      folderId?: string;
      documentId?: string;
      data?: unknown;
    }) => {
      // Refresh folder tree on any sync event
      if (
        event.type === "folder_added" ||
        event.type === "folder_updated" ||
        event.type === "folder_deleted" ||
        event.type === "sync_completed"
      ) {
        loadFolderTree();
      }

      // Refresh folder contents if event affects current folder
      if (selectedFolderId) {
        // If event has folderId, only refresh if it matches selected folder
        // Otherwise, refresh for any document_* event (fallback for events without folderId)
        if (
          event.folderId === selectedFolderId ||
          (!event.folderId &&
            (event.type === "document_added" ||
              event.type === "document_updated" ||
              event.type === "document_deleted"))
        ) {
          console.log(
            `Refreshing folder ${selectedFolderId} due to event:`,
            event.type,
            event.folderId ? `(folderId: ${event.folderId})` : "(no folderId)"
          );
          loadFolderContents(selectedFolderId);
        }
      }
    },
    [selectedFolderId, loadFolderTree, loadFolderContents]
  );

  useFolderSync({
    onSyncEvent: handleSyncEvent,
    folderId: selectedFolderId || undefined,
    enabled: true,
  });

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  const handleUpload = async (file: File) => {
    if (!selectedFolderId) return;

    setUploading(true);
    setUploadFileName(file.name);
    setUploadProgress({ percentage: 0, speed: 0, eta: 0 });

    const { promise, abort } = api.uploadWithProgress(
      "/storage/documents/upload",
      file,
      { folderId: selectedFolderId },
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
      loadFolderContents(selectedFolderId);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
      setUploadProgress(null);
      setUploadFileName("");
      if (error instanceof Error && error.message !== "Upload cancelled") {
        alert(error.message);
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
      await api.post("/storage/folders/sync");
      // Refresh folder tree after sync
      await loadFolderTree();
      // If a folder was selected, refresh its contents too
      if (selectedFolderId) {
        await loadFolderContents(selectedFolderId);
      }
    } catch (error) {
      console.error("Sync failed:", error);
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Tree */}
        <Card className="lg:col-span-1 p-4">
          <h3 className="font-semibold mb-4">{t("folder")}</h3>
          <FolderTree
            folders={folders}
            selectedId={selectedFolderId}
            onSelect={handleFolderSelect}
          />
        </Card>

        {/* Document List */}
        <div className="lg:col-span-3 space-y-4">
          <DocumentToolbar
            folder={selectedFolder}
            onUpload={handleUpload}
            onRefresh={() =>
              selectedFolderId && loadFolderContents(selectedFolderId)
            }
            onSync={handleSync}
          />

          <Card className="p-4">
            {selectedFolderId ? (
              <DocumentList
                documents={documents}
                onDocumentClick={(doc) => {
                  // Open document viewer
                  window.open(`/dashboard/documents/${doc.id}/view`, "_blank");
                }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {t("selectFolder")}
              </div>
            )}
          </Card>
        </div>
      </div>

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
