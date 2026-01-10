"use client";

import { FileText, X } from "lucide-react";
import { KpiAttachment } from "@/lib/api";
import { useTranslations } from "next-intl";

interface KpiAttachmentListProps {
  attachments: KpiAttachment[];
  onAttachmentClick: (attachmentId: string) => void;
  onAttachmentDelete?: (attachmentId: string) => void;
  canView: boolean;
  canDelete?: boolean;
  variant?: "default" | "cyber"; // Style variant: default for regular UI, cyber for boss UI
}

export function KpiAttachmentList({
  attachments,
  onAttachmentClick,
  onAttachmentDelete,
  canView,
  canDelete = false,
  variant = "default",
}: KpiAttachmentListProps) {
  const t = useTranslations("boss.kpi.attachments");

  if (!canView) {
    return null;
  }

  if (attachments.length === 0) {
    return (
      <div
        className={`text-xs ${variant === "cyber" ? "text-cyan-400/50 font-cyber" : "text-muted-foreground"}`}
      >
        {t("noAttachments")}
      </div>
    );
  }

  const displayAttachments = attachments.slice(0, 3);
  const remainingCount = attachments.length - 3;

  const handleDelete = (e: React.MouseEvent, attachmentId: string) => {
    e.stopPropagation();
    if (
      onAttachmentDelete &&
      confirm(t("deleteConfirm") || "Bạn có chắc muốn xóa file này?")
    ) {
      onAttachmentDelete(attachmentId);
    }
  };

  const containerClass =
    variant === "cyber"
      ? "group relative flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all text-xs font-cyber text-cyan-300 cyber-text-glow"
      : "group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted border border-border rounded-md hover:bg-accent hover:border-accent-foreground/20 transition-all text-xs";

  const buttonClass =
    variant === "cyber"
      ? "flex items-center gap-1.5 flex-1 min-w-0"
      : "flex items-center gap-1.5 flex-1 min-w-0 text-muted-foreground hover:text-foreground";

  const fileNameClass =
    variant === "cyber"
      ? "max-w-[120px] truncate"
      : "max-w-[140px] truncate font-medium";

  const deleteButtonClass =
    variant === "cyber"
      ? "ml-1 p-0.5 hover:bg-red-500/20 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
      : "ml-1 p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100";

  const deleteIconClass =
    variant === "cyber"
      ? "h-3 w-3 text-red-400 hover:text-red-300"
      : "h-3.5 w-3.5 text-destructive hover:text-destructive/80";

  const moreFilesClass =
    variant === "cyber"
      ? "text-xs font-cyber text-fuchsia-400 cyber-text-glow"
      : "text-xs text-muted-foreground";

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {displayAttachments.map((attachment) => (
        <div key={attachment.id} className={containerClass}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAttachmentClick(attachment.id);
            }}
            className={buttonClass}
            title={attachment.fileName}
            aria-label={`${t("viewer.title")}: ${attachment.fileName}`}
          >
            <FileText
              className={`${variant === "cyber" ? "h-3 w-3" : "h-3.5 w-3.5"} flex-shrink-0`}
            />
            <span className={fileNameClass}>{attachment.fileName}</span>
          </button>
          {canDelete && onAttachmentDelete && (
            <button
              onClick={(e) => handleDelete(e, attachment.id)}
              className={deleteButtonClass}
              title={t("delete") || "Xóa file"}
              aria-label={t("delete") || "Xóa file"}
            >
              <X className={deleteIconClass} />
            </button>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <span className={moreFilesClass}>
          {t("moreFiles", { count: remainingCount })}
        </span>
      )}
    </div>
  );
}
