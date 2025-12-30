"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCopyProtection } from "@/hooks/use-copy-protection";
import { PdfViewer } from "@/components/viewers/pdf-viewer";
import { DocxViewer } from "@/components/viewers/docx-viewer";
import { Watermark } from "@/components/viewers/watermark";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface DocumentDetailProps {
  documentId: string;
  onBack: () => void;
}

export function DocumentDetail({ documentId, onBack }: DocumentDetailProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Boss role has view, download, print permissions (read-only)
  const canDownload = true;
  const canPrint = true;

  // Enable copy protection if user cannot download
  useCopyProtection(!canDownload);

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const doc = await api.get<Document>(`/storage/documents/${documentId}`);
      setDocument(doc);
    } catch (err) {
      console.error("Failed to load document:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [documentId, tCommon]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleDownload = () => {
    window.open(`/api/storage/documents/${documentId}/download`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500" />
          <div
            className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-2 border-transparent border-r-fuchsia-500/30 border-t-fuchsia-500"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center text-fuchsia-400 cyber-text-glow">
            <p className="font-cyber font-semibold text-lg">{t("error.loadDocumentsFailed")}</p>
            <p className="text-sm mt-2 text-cyan-300/90">{error || t("notFound.document")}</p>
          </div>
        </div>
      </div>
    );
  }

  const fileUrl = `/api/storage/documents/${documentId}/stream`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>

        <div className="flex items-center gap-3">
          {canPrint && (
            <button
              className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              {t("document.print")}
            </button>
          )}

          {canDownload && (
            <button
              className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              {t("document.download")}
            </button>
          )}
        </div>
      </div>

      {/* Document Info */}
      <div className="cyber-card cyber-corner p-5">
        <div>
          <h2 className="font-cyber font-bold text-xl mb-2 cyber-neon-cyan">{document.name}</h2>
          <p className="text-sm font-cyber text-cyan-300/80">{document.fileName}</p>
        </div>
      </div>

      {/* Viewer */}
      <div
        className={`relative overflow-hidden cyber-border rounded-lg bg-[#0a0a15] min-h-[600px] ${
          !canDownload ? "viewer-protected" : ""
        }`}
      >
        {document.fileType === "pdf" && (
          <PdfViewer
            fileUrl={fileUrl}
            canDownload={canDownload}
            canPrint={canPrint}
          />
        )}

        {["doc", "docx"].includes(document.fileType) && (
          <DocxViewer fileUrl={fileUrl} />
        )}

        {["png", "jpg", "jpeg", "gif"].includes(document.fileType) && (
          <div className="flex items-center justify-center h-full p-4">
            <img
              src={fileUrl}
              alt={document.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {/* Watermark */}
        {!canDownload && user && (
          <Watermark
            text={`${user.email} - ${new Date().toLocaleDateString(locale)}`}
          />
        )}
      </div>
    </div>
  );
}
