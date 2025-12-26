"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <Card className="p-6">
          <div className="text-center text-destructive">
            <p className="font-semibold">{t("error.loadDocumentsFailed")}</p>
            <p className="text-sm mt-1">{error || t("notFound.document")}</p>
          </div>
        </Card>
      </div>
    );
  }

  const fileUrl = `/api/storage/documents/${documentId}/stream`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>

        <div className="flex items-center gap-2">
          {canPrint && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              {t("document.print")}
            </Button>
          )}

          {canDownload && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              {t("document.download")}
            </Button>
          )}
        </div>
      </div>

      {/* Document Info */}
      <Card className="p-4">
        <div>
          <h2 className="font-semibold text-lg">{document.name}</h2>
          <p className="text-sm text-muted-foreground">{document.fileName}</p>
        </div>
      </Card>

      {/* Viewer */}
      <div
        className={`relative overflow-hidden border rounded-lg bg-gray-100 min-h-[600px] ${
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
