"use client";

import { useTranslations } from "next-intl";
import { useCanAccess } from "@/hooks/use-can-access";
import { PdfViewer } from "@/components/viewers/pdf-viewer";
import { DocxViewer } from "@/components/viewers/docx-viewer";
import { XlsxViewer } from "@/components/viewers/xlsx-viewer";
import { PptViewer } from "@/components/viewers/ppt-viewer";

interface ClientFileViewerProps {
  fileId: string;
  fileType: string;
  fileName: string;
}

const streamUrl = (id: string) => `/api/client/files/${id}/stream`;

export function ClientFileViewer({
  fileId,
  fileType,
  fileName,
}: ClientFileViewerProps) {
  const t = useTranslations("client");
  const canDownload = useCanAccess("download", "Client");
  const canPrint = useCanAccess("print", "Client");
  const url = streamUrl(fileId);
  const ext = (fileType || "").toLowerCase();

  if (ext === "pdf") {
    return (
      <PdfViewer
        fileUrl={url}
        canDownload={canDownload}
        canPrint={canPrint}
      />
    );
  }

  if (ext === "doc" || ext === "docx") {
    return <DocxViewer fileUrl={url} />;
  }

  if (ext === "xls" || ext === "xlsx") {
    return <XlsxViewer fileUrl={url} fileType={ext} />;
  }

  if (ext === "ppt" || ext === "pptx") {
    return (
      <PptViewer
        fileUrl={url}
        fileName={fileName}
      />
    );
  }

  return (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded border bg-muted/30 p-4 text-muted-foreground">
      {t("unsupportedFileType", { type: fileType || "?" })}
    </div>
  );
}
