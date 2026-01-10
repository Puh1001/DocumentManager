"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { kpiAttachmentApi, KpiAttachment } from "@/lib/api";
import { useCanAccess } from "@/hooks/use-can-access";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface KpiAttachmentUploadProps {
  kpiRecordId: string;
  folderId: string;
  onUploadSuccess: (attachment: KpiAttachment) => void;
  variant?: "default" | "cyber"; // Style variant: default for regular UI, cyber for boss UI
}

export function KpiAttachmentUpload({
  kpiRecordId,
  folderId,
  onUploadSuccess,
  variant = "default",
}: KpiAttachmentUploadProps) {
  const t = useTranslations("boss.kpi.attachments");
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canCreate = useCanAccess("create", "Kpi");

  if (!canCreate) {
    return null;
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast({
        title: "Lỗi",
        description: "Chỉ chấp nhận file PDF",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);
    try {
      const result = await kpiAttachmentApi.uploadAttachment(
        kpiRecordId,
        file,
        folderId,
        undefined
      );

      // Convert result to KpiAttachment format
      const attachment: KpiAttachment = {
        id: result.id,
        documentId: result.documentId,
        fileName: file.name,
        uploadedBy: "", // Will be filled by backend
        createdAt: result.createdAt,
        description: result.description,
      };

      onUploadSuccess(attachment);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Thành công",
        description: "Đã tải lên file PDF thành công",
        variant: "default",
      });
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Không thể tải lên file";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (variant === "cyber") {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`kpi-upload-${kpiRecordId}`}
        />
        <label
          htmlFor={`kpi-upload-${kpiRecordId}`}
          className="cyber-button px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={t("upload") || "Tải lên PDF"}
        >
          <Upload className="h-3 w-3" />
          <span>{uploading ? "Đang tải..." : t("upload") || "Tải lên"}</span>
        </label>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id={`kpi-upload-${kpiRecordId}`}
      />
      <Button variant="outline" size="sm" asChild disabled={uploading}>
        <label
          htmlFor={`kpi-upload-${kpiRecordId}`}
          className="flex items-center gap-1.5 cursor-pointer"
          title={t("upload") || "Tải lên PDF"}
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{uploading ? "Đang tải..." : t("upload") || "Tải lên"}</span>
        </label>
      </Button>
    </div>
  );
}
