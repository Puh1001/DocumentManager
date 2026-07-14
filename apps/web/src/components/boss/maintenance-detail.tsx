"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  maintenanceApi,
  maintenanceAttachmentApi,
  type MaintenanceNotice,
  type MaintenanceAttachment,
} from "@/lib/api";
import {
  ArrowLeft,
  Wrench,
  Calendar,
  Building2,
  User,
  Eye,
  Download,
  Printer,
  Loader2,
} from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";
import { PdfViewer } from "@/components/viewers/pdf-viewer";

interface MaintenanceDetailProps {
  maintenanceId: string;
  onBack: () => void;
}

export function MaintenanceDetail({
  maintenanceId,
  onBack,
}: MaintenanceDetailProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
    });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString(locale, {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const [notice, setNotice] = useState<MaintenanceNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attachments state
  const [attachments, setAttachments] = useState<MaintenanceAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<MaintenanceAttachment | null>(null);

  const loadNotice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceApi.getById(maintenanceId);
      setNotice(data);
    } catch (err) {
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [maintenanceId, tCommon]);

  const loadAttachments = useCallback(async () => {
    setLoadingAttachments(true);
    try {
      const data = await maintenanceAttachmentApi.getAttachments(maintenanceId);
      setAttachments(data);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoadingAttachments(false);
    }
  }, [maintenanceId]);

  useEffect(() => {
    loadNotice();
  }, [loadNotice]);

  // Load attachments once notice is loaded
  useEffect(() => {
    if (notice) loadAttachments();
  }, [notice, loadAttachments]);

  const handleDownload = async (att: MaintenanceAttachment) => {
    try {
      const buffer = await maintenanceAttachmentApi.downloadAttachment(att.id);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handlePrint = async (att: MaintenanceAttachment) => {
    try {
      const buffer = await maintenanceAttachmentApi.downloadAttachment(att.id);
      const blob = new Blob([buffer], { type: att.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png" });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          try {
            printWindow.print();
          } catch {
            // ignore print errors
          }
        };
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Print failed", err);
    }
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

  if (error || !notice) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center text-fuchsia-400 cyber-text-glow">
            <p className="font-cyber font-semibold text-lg">{t("error.loadMaintenanceFailed")}</p>
            <p className="text-sm mt-2 text-cyan-300/90">{error || t("notFound.maintenance")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t("actions.back")}
      </button>

      {/* Notice details card */}
      <div className="cyber-card cyber-corner">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6 pb-4 border-b border-cyan-500/20">
            <div className="p-3 cyber-border rounded-lg bg-fuchsia-500/10">
              <Wrench className="h-6 w-6 text-fuchsia-400 cyber-text-glow" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-cyber font-bold cyber-neon-magenta">{notice.title}</h1>
            </div>
          </div>
          <div className="space-y-6">
            {notice.description && (
              <div>
                <h3 className="text-sm font-cyber font-semibold mb-3 text-cyan-300/80">{t("maintenance.description")}</h3>
                <p className="text-sm font-cyber text-cyan-200/90 whitespace-pre-wrap leading-relaxed">{notice.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">{t("maintenance.startDate")}</span>
                </div>
                <p className="text-base font-cyber text-cyan-200">{formatDate(notice.startDate)}</p>
              </div>
              <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">{t("maintenance.endDate")}</span>
                </div>
                <p className="text-base font-cyber text-cyan-200">{formatDate(notice.endDate)}</p>
              </div>
              {notice.department && (
                <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                  <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                    <Building2 className="h-4 w-4" />
                    <span className="font-semibold">{t("maintenance.department")}</span>
                  </div>
                  <p className="text-base font-cyber text-cyan-200">{notice.department.name}</p>
                  <p className="text-sm font-cyber text-cyan-300/70">{notice.department.code}</p>
                </div>
              )}
              {notice.creator && (
                <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                  <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">{t("maintenance.createdBy")}</span>
                  </div>
                  <p className="text-base font-cyber text-cyan-200">{notice.creator.fullName}</p>
                  <p className="text-sm font-cyber text-cyan-300/70">{notice.creator.username}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-cyan-500/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">{t("maintenance.createdAt")}</span>
              </div>
              <p className="text-sm font-cyber text-cyan-200">{formatDateTime(notice.createdAt)}</p>
              {notice.updatedAt !== notice.createdAt && (
                <>
                  <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80 mt-4">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">{t("maintenance.updatedAt")}</span>
                  </div>
                  <p className="text-sm font-cyber text-cyan-200">{formatDateTime(notice.updatedAt)}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attachments card */}
      <div className="cyber-card cyber-corner">
        <div className="p-6">
          <h2 className="text-lg font-cyber font-bold mb-4 cyber-neon-cyan">
            Attachments ({attachments.length})
          </h2>

          {loadingAttachments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-cyan-400/60 font-cyber">No attachments for this maintenance notice.</p>
          ) : (
            <div className="space-y-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg">
                      {att.fileName.toLowerCase().endsWith(".pdf") ? "📄" : "🖼️"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-cyber text-cyan-100 truncate">{att.fileName}</p>
                      <p className="text-[11px] text-cyan-400/60 font-cyber">
                        {att.uploadedBy} &middot; {new Date(att.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* View */}
                    <button
                      type="button"
                      onClick={() => setViewingAttachment(att)}
                      className="cyber-button p-2 rounded hover:bg-cyan-500/20 transition-colors"
                      title="View"
                    >
                      <Eye className="h-4 w-4 text-cyan-400" />
                    </button>
                    {/* Download */}
                    <button
                      type="button"
                      onClick={() => handleDownload(att)}
                      className="cyber-button p-2 rounded hover:bg-cyan-500/20 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4 text-cyan-400" />
                    </button>
                    {/* Print */}
                    <button
                      type="button"
                      onClick={() => handlePrint(att)}
                      className="cyber-button p-2 rounded hover:bg-cyan-500/20 transition-colors"
                      title="Print"
                    >
                      <Printer className="h-4 w-4 text-cyan-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen PDF viewer modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f0f1a] border border-cyan-500/30 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col cyber-corner">
            {/* Viewer header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
              <h3 className="text-sm font-cyber font-semibold text-cyan-100 truncate max-w-md">
                {viewingAttachment.fileName}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(viewingAttachment)}
                  className="cyber-button px-3 py-1.5 font-cyber text-xs flex items-center gap-1.5 rounded"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("document.download")}
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(viewingAttachment)}
                  className="cyber-button px-3 py-1.5 font-cyber text-xs flex items-center gap-1.5 rounded"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t("document.print")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingAttachment(null)}
                  className="cyber-button px-3 py-1.5 font-cyber text-xs rounded ml-2"
                >
                  Close
                </button>
              </div>
            </div>
            {/* PDF viewer */}
            <div className="flex-1 min-h-0">
              <PdfViewer
                fileUrl={maintenanceAttachmentApi.getAttachmentStreamUrl(viewingAttachment.id)}
                canDownload={true}
                canPrint={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
