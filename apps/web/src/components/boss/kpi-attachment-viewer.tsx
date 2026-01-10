"use client";

import { X, Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { PdfViewer } from "@/components/viewers/pdf-viewer";
import { useCanAccess } from "@/hooks/use-can-access";
import { useCopyProtection } from "@/hooks/use-copy-protection";
import { kpiAttachmentApi } from "@/lib/api";

interface KpiAttachmentViewerProps {
  attachmentId: string;
  fileName: string;
  onClose: () => void;
}

export function KpiAttachmentViewer({
  attachmentId,
  fileName,
  onClose,
}: KpiAttachmentViewerProps) {
  const t = useTranslations("boss.kpi.attachments.viewer");
  const canDownload = useCanAccess("download", "Kpi");
  const canPrint = useCanAccess("print", "Kpi");
  const canCopy = useCanAccess("copy", "Kpi");

  /**
   * Enable copy protection (best-effort, not foolproof)
   * Note: Can be bypassed via browser DevTools or screenshots
   * For sensitive documents, consider watermarking
   */
  useCopyProtection(!canCopy);

  const streamUrl = kpiAttachmentApi.getAttachmentStreamUrl(attachmentId);

  const handleDownload = async () => {
    if (!canDownload) return;

    try {
      const arrayBuffer = await kpiAttachmentApi.downloadAttachment(attachmentId);
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Error notification handled by parent or global error handler
    }
  };

  const handlePrint = () => {
    if (!canPrint) return;
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl h-[90vh] cyber-card cyber-corner flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-cyan-500/20 bg-gray-900/50">
          <h2 className="font-cyber font-bold text-lg cyber-neon-cyan truncate flex-1">
            {fileName}
          </h2>
          <div className="flex items-center gap-2">
            {canDownload && (
              <button
                onClick={handleDownload}
                className="cyber-button px-3 py-2 text-sm flex items-center gap-2"
                title={t("download")}
                aria-label={t("download")}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t("download")}</span>
              </button>
            )}
            {canPrint && (
              <button
                onClick={handlePrint}
                className="cyber-button px-3 py-2 text-sm flex items-center gap-2"
                title={t("print")}
                aria-label={t("print")}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">{t("print")}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="cyber-button px-3 py-2 text-sm flex items-center gap-2"
              title={t("close")}
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">{t("close")}</span>
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 relative overflow-hidden">
          <PdfViewer
            fileUrl={streamUrl}
            canDownload={canDownload}
            canPrint={canPrint}
            canCopy={canCopy}
          />
        </div>
      </div>
    </div>
  );
}
