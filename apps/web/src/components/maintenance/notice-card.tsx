"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  Paperclip,
  Pencil,
  Trash2,
  Eye,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type MaintenanceNotice,
  type MaintenanceAttachment,
  maintenanceAttachmentApi,
} from "@/lib/api";
import { useCanAccess } from "@/hooks/use-can-access";
import { useToast } from "@/hooks/use-toast";

interface NoticeCardProps {
  notice: MaintenanceNotice;
  departmentName: string;
  t: ReturnType<typeof useTranslations<"maintenance">>;
  commonT: ReturnType<typeof useTranslations<"common">>;
  errorT: ReturnType<typeof useTranslations<"errors">>;
  onEdit: (notice: MaintenanceNotice) => void;
  onDelete: (id: string) => void;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export function NoticeCard({
  notice,
  departmentName,
  t,
  commonT,
  errorT,
  onEdit,
  onDelete,
}: NoticeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<MaintenanceAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canCreate = useCanAccess("create", "Maintenance");
  const { toast } = useToast();

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const data = await maintenanceAttachmentApi.getAttachments(notice.id);
      setAttachments(data);
    } catch (err) {
      console.error("Failed to load attachments", err);
      toast({ title: errorT("loadFailed"), variant: "destructive" });
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleToggleExpand = () => {
    if (!expanded) loadAttachments();
    setExpanded(!expanded);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await maintenanceAttachmentApi.uploadAttachment(
        notice.id, file, undefined,
      );
      const a: MaintenanceAttachment = {
        id: result.id,
        documentId: result.documentId,
        fileName: file.name,
        uploadedBy: "",
        createdAt: result.createdAt,
        description: result.description,
      };
      setAttachments((prev) => [a, ...prev]);
      toast({ title: t("toast.attachmentUploaded") });
    } catch (err) {
      console.error("Upload failed", err);
      toast({ title: errorT("uploadFailed"), variant: "destructive" });
    } finally {
      setUploading(false);
      (e.target as HTMLInputElement).value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    try {
      await maintenanceAttachmentApi.deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast({ title: t("toast.attachmentDeleted") });
    } catch (err) {
      console.error("Delete failed", err);
      toast({ title: errorT("deleteFailed"), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold">{notice.title}</p>
          <p className="text-xs text-muted-foreground">
            {t("list.department")}: {departmentName}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("list.windowLabel")}: {formatDate(notice.startDate)} -{" "}
            {formatDate(notice.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {new Date(notice.createdAt).toLocaleDateString()}
          </span>
          <Button
            variant="ghost" size="sm" onClick={() => onEdit(notice)}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="sm" onClick={() => onDelete(notice.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {notice.description && (
        <p className="mt-2 text-sm text-muted-foreground">{notice.description}</p>
      )}

      {/* Attachments toggle */}
      <button
        type="button"
        onClick={handleToggleExpand}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Paperclip className="h-3 w-3" />
        {t("attachments.title")}
        {attachments.length > 0 && ` (${attachments.length})`}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 border-t pt-2">
          {/* Upload button */}
          {canCreate && (
            <div>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/png,image/jpeg,image/gif,image/webp"
                id={`upload-${notice.id}`}
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor={`upload-${notice.id}`}>
                <Button variant="outline" size="sm" asChild disabled={uploading} className="cursor-pointer">
                  <span>
                    {uploading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3 mr-1" />
                    )}
                    {t("attachments.upload")}
                  </span>
                </Button>
              </label>
              <p className="mt-1 text-[10px] text-muted-foreground">{t("attachments.fileTypes")}</p>
            </div>
          )}

          {loadingAttachments && (
            <p className="text-xs text-muted-foreground">{commonT("status.loading")}</p>
          )}

          {!loadingAttachments && attachments.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("attachments.noFiles")}</p>
          )}

          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between rounded border border-border px-2 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">
                  {att.fileName.toLowerCase().endsWith(".pdf") ? "📄" : "🖼️"}
                </span>
                <span className="text-xs truncate max-w-[160px]">{att.fileName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                  <a
                    href={maintenanceAttachmentApi.getAttachmentStreamUrl(att.id)}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Eye className="h-3 w-3" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDownload(att)}>
                  <Download className="h-3 w-3" />
                </Button>
                {canCreate && (
                  <Button
                    variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAttachment(att.id)}
                    disabled={deletingId === att.id}
                  >
                    {deletingId === att.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
