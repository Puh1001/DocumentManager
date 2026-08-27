"use client";

import { useState } from "react";
import { KpiAttachment } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { KpiAttachmentItem } from "./kpi-attachment-item";
import { KpiAttachmentDeletionRequestDialog } from "./kpi-attachment-deletion-request-dialog";

interface KpiAttachmentListProps {
  attachments: KpiAttachment[];
  onAttachmentClick: (attachmentId: string) => void;
  onAttachmentDelete?: (attachmentId: string) => void;
  onAttachmentRenamed?: (attachmentId: string) => void;
  canView: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  variant?: "default" | "cyber"; // Style variant: default for regular UI, cyber for boss UI
}

export function KpiAttachmentList({
  attachments,
  onAttachmentClick,
  onAttachmentDelete,
  onAttachmentRenamed,
  canView,
  canDelete = false,
  canEdit = false,
  variant = "default",
}: KpiAttachmentListProps) {
  const t = useTranslations("boss.kpi.attachments");
  const { toast } = useToast();
  const [deletionRequestDialogOpen, setDeletionRequestDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<KpiAttachment | null>(null);

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

  const handleDeletionRequest = (attachment: KpiAttachment) => {
    setSelectedAttachment(attachment);
    setDeletionRequestDialogOpen(true);
  };

  const moreFilesClass =
    variant === "cyber"
      ? "text-xs font-cyber text-fuchsia-400 cyber-text-glow"
      : "text-xs text-muted-foreground";

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {displayAttachments.map((attachment) => (
          <KpiAttachmentItem
            key={attachment.id}
            attachment={attachment}
            onAttachmentClick={onAttachmentClick}
            onAttachmentDelete={onAttachmentDelete}
            onDeletionRequest={handleDeletionRequest}
            onAttachmentRenamed={onAttachmentRenamed}
            canDelete={canDelete}
            canEdit={canEdit}
            variant={variant}
          />
        ))}
        {remainingCount > 0 && (
          <span className={moreFilesClass}>
            {t("moreFiles", { count: remainingCount })}
          </span>
        )}
      </div>

      {/* Deletion request dialog */}
      {selectedAttachment && (
        <KpiAttachmentDeletionRequestDialog
          open={deletionRequestDialogOpen}
          onOpenChange={setDeletionRequestDialogOpen}
          attachmentId={selectedAttachment.id}
          documentId={selectedAttachment.documentId}
          fileName={selectedAttachment.fileName}
          onSubmitted={() => {
            // Refresh deletion status after request submitted
            toast({
              title: "Success",
              description: "Deletion request submitted. DCC will review it.",
            });
            setSelectedAttachment(null);
          }}
        />
      )}
    </>
  );
}
