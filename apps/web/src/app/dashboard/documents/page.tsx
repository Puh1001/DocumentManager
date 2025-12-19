"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { FolderTree } from "@/components/documents/folder-tree";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { Card } from "@/components/ui/card";

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

export default function DocumentsPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFolderTree();
  }, []);

  useEffect(() => {
    if (selectedFolderId) {
      loadFolderContents(selectedFolderId);
    }
  }, [selectedFolderId]);

  const loadFolderTree = async () => {
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
  };

  const loadFolderContents = async (folderId: string) => {
    try {
      const folder = await api.get<Folder>(`/storage/folders/${folderId}`);
      setSelectedFolder(folder);
      setDocuments(folder.documents || []);
    } catch (error) {
      console.error("Failed to load folder contents:", error);
    }
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  const handleUpload = async (file: File) => {
    if (!selectedFolderId) return;

    try {
      await api.upload("/storage/documents/upload", file, {
        folderId: selectedFolderId,
      });
      loadFolderContents(selectedFolderId);
    } catch (error) {
      console.error("Upload failed:", error);
    }
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
        <h1 className="text-2xl font-bold tracking-tight">Quản lý tài liệu</h1>
        <p className="text-muted-foreground">Duyệt và quản lý tài liệu ISO</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Tree */}
        <Card className="lg:col-span-1 p-4">
          <h3 className="font-semibold mb-4">Thư mục</h3>
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
                Chọn một thư mục để xem tài liệu
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
