"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCopyProtection } from "@/hooks/use-copy-protection";
import { PdfViewer } from "@/components/viewers/pdf-viewer";
import { DocxViewer } from "@/components/viewers/docx-viewer";
import { XlsxViewer } from "@/components/viewers/xlsx-viewer";
import { ImageViewer } from "@/components/viewers/image-viewer";
import { Watermark } from "@/components/viewers/watermark";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ExternalLink, Printer } from "lucide-react";
import { fixFileNameEncoding } from "@/lib/utils/encoding-fix";

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface Permissions {
  canView: boolean;
  canDownload: boolean;
  canPrint: boolean;
  canEdit: boolean;
}

export default function DocumentViewPage() {
  const params = useParams<{ locale?: string; id?: string }>();
  const documentId = params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const [docData, setDocData] = useState<Document | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({
    canView: true,
    canDownload: false,
    canPrint: false,
    canEdit: false,
  });
  const [loading, setLoading] = useState(true);

  // Enable copy protection if user cannot download
  useCopyProtection(!permissions.canDownload);

  // Block print/save keyboard shortcuts when user cannot download
  useEffect(() => {
    if (permissions.canDownload || permissions.canPrint) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        alert("Bạn không có quyền tải xuống tài liệu này.");
        return false;
      }

      // Block Ctrl+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        alert("Bạn không có quyền in tài liệu này.");
        return false;
      }

      // Block F12, Ctrl+Shift+I (DevTools)
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I")
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [permissions.canDownload, permissions.canPrint]);

  const loadDocument = useCallback(async () => {
    try {
      if (!documentId) return;
      const [doc, perms] = await Promise.all([
        api.get<Document>(`/storage/documents/${documentId}`),
        api.get<Permissions>(`/storage/documents/${documentId}/permissions`),
      ]);
      setDocData(doc);
      setPermissions(perms);
    } catch (error) {
      console.error("Failed to load document:", error);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleDownload = () => {
    if (!documentId) return;
    window.open(`/api/storage/documents/${documentId}/download`, "_blank");
  };

  const handleOpenLocal = async () => {
    try {
      if (!documentId) return;
      interface OpenPathResponse {
        networkPath: string;
      }
      const response = await api.get<OpenPathResponse>(
        `/storage/documents/${documentId}/open-path`
      );
      await navigator.clipboard.writeText(response.networkPath);
      alert(
        `Đường dẫn đã được sao chép:\n${response.networkPath}\n\nDán vào Run (Win+R) hoặc Explorer để mở file.`
      );
    } catch (error) {
      console.error("Failed to get open path:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Không tìm thấy tài liệu</p>
      </div>
    );
  }

  const fileUrl = `/api/storage/documents/${documentId}/stream`;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{docData.name}</h1>
            <p className="text-xs text-muted-foreground">
              {fixFileNameEncoding(docData.fileName)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permissions.canPrint && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              In
            </Button>
          )}

          {permissions.canDownload && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Tải xuống
            </Button>
          )}

          {permissions.canEdit && (
            <Button size="sm" onClick={handleOpenLocal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Mở để chỉnh sửa
            </Button>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div
        className={`flex-1 relative overflow-hidden ${!permissions.canDownload ? "viewer-protected" : ""}`}
      >
        {docData.fileType === "pdf" && (
          <PdfViewer
            fileUrl={fileUrl}
            canDownload={permissions.canDownload}
            canPrint={permissions.canPrint}
          />
        )}

        {["doc", "docx"].includes(docData.fileType) && (
          <DocxViewer fileUrl={fileUrl} />
        )}

        {["xls", "xlsx"].includes(docData.fileType) && (
          <XlsxViewer fileUrl={fileUrl} />
        )}

        {["png", "jpg", "jpeg", "gif"].includes(docData.fileType) && (
          <ImageViewer fileUrl={fileUrl} alt={docData.name} />
        )}

        {/* Watermark */}
        {!permissions.canDownload && user && (
          <Watermark
            text={`${user.email} - ${new Date().toLocaleDateString()}`}
          />
        )}
      </div>
    </div>
  );
}
