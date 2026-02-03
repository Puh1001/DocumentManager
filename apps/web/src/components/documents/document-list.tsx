"use client";

import { useTranslations } from "next-intl";
import { fixFileNameEncoding } from "@/lib/utils/encoding-fix";
import { formatDateShort } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, Download, History, ExternalLink, FileEdit } from "lucide-react";
import { useAbility } from "@/hooks/use-ability";
import { Document as DocumentType } from "@/lib/types/ability.types";
import type {
  Document,
  DocumentLevel,
  DocumentUser,
} from "@/lib/types/document.types";
import { DeletionStatusBadge } from "./deletion-status-badge";
import { DeletionActions } from "./deletion-actions";
import { DeletionErrorBoundary } from "./deletion-error-boundary";
import { IsoMetadataEditDialog } from "./iso-metadata-edit-dialog";
import { useState } from "react";

const PLACEHOLDER = "—";

function getLevelDisplayName(
  level: DocumentLevel | null | undefined,
  locale: string
): string {
  if (!level) return PLACEHOLDER;
  if (locale === "vi" && level.nameVi) return level.nameVi;
  if (locale === "zh" && level.nameZh) return level.nameZh;
  if (locale === "en" && level.nameEn) return level.nameEn;
  return level.name;
}

function formatUserName(user: DocumentUser | null | undefined): string {
  if (!user) return PLACEHOLDER;
  return user.fullName?.trim() || user.username || PLACEHOLDER;
}

function formatDateOrPlaceholder(
  date: string | null | undefined,
  locale: string
): string {
  if (date == null || date === "") return PLACEHOLDER;
  try {
    return formatDateShort(date, locale);
  } catch {
    return PLACEHOLDER;
  }
}

interface DocumentListProps {
  documents: Document[];
  locale?: string;
  onDocumentClick?: (doc: Document) => void;
  onDocumentDeleted?: (documentId: string) => void;
  onDocumentMetadataUpdated?: (documentId: string) => void;
}

export function DocumentList({
  documents,
  locale = "en",
  onDocumentClick,
  onDocumentDeleted,
  onDocumentMetadataUpdated,
}: DocumentListProps) {
  const t = useTranslations("documents.list");
  const { ability } = useAbility();
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [selectedDocumentForMetadata, setSelectedDocumentForMetadata] =
    useState<Document | null>(null);

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.no")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.title")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.version")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.level")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.responsibleDepartment")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.preparer")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.reviewer")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.approver")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.approvalDate")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.receiptDate")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.storageLocation")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.status")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("columns.uploadPDF")}
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, index) => (
            <tr
              key={doc.id}
              className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onDocumentClick?.(doc)}
            >
              <td className="py-3 px-4 text-sm">{index + 1}</td>
              <td className="py-3 px-4">
                <p className="font-medium">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fixFileNameEncoding(doc.fileName)}
                </p>
              </td>
              <td className="py-3 px-4 text-sm">
                {doc._count?.versions != null && doc._count.versions > 0
                  ? doc._count.versions
                  : doc._count?.versions === 0
                    ? "0"
                    : PLACEHOLDER}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {getLevelDisplayName(doc.level, locale)}
              </td>
              <td className="py-3 px-4 text-sm">
                {doc.folder?.department?.name ?? PLACEHOLDER}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatUserName(doc.preparer)}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatUserName(doc.reviewer)}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatUserName(doc.approver)}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDateOrPlaceholder(doc.approvalDate, locale)}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDateOrPlaceholder(doc.receiptDate, locale)}
              </td>
              <td
                className="py-3 px-4 text-sm text-muted-foreground max-w-[12rem] truncate"
                title={doc.folder?.path}
              >
                {doc.folder?.path ?? PLACEHOLDER}
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                  {doc.status ?? PLACEHOLDER}
                </span>
              </td>
              <td className="py-3 px-4">
                <div onClick={(e) => e.stopPropagation()}>
                  {ability?.can("view", {
                    id: doc.id,
                    folderId: doc.folderId ?? doc.folder?.id ?? undefined,
                  } as DocumentType) && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `/${locale}/dashboard/documents/${doc.id}/view`,
                          "_blank"
                        );
                      }}
                    >
                      {t("actions.view")}
                    </Button>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ability?.can("view", {
                    id: doc.id,
                    folderId: doc.folderId ?? doc.folder?.id ?? undefined,
                  } as DocumentType) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("actions.view")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {ability?.can("download", {
                    id: doc.id,
                    folderId: doc.folderId ?? doc.folder?.id ?? undefined,
                  } as DocumentType) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("actions.download")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {ability?.can("edit", {
                    id: doc.id,
                    folderId: doc.folderId ?? doc.folder?.id ?? undefined,
                  } as DocumentType) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("actions.openToEdit")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {ability?.can("edit", {
                    id: doc.id,
                    folderId: doc.folderId ?? doc.folder?.id ?? undefined,
                  } as DocumentType) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("actions.editMetadata")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocumentForMetadata(doc);
                        setMetadataDialogOpen(true);
                      }}
                    >
                      <FileEdit className="h-4 w-4" />
                    </Button>
                  )}
                  {ability?.can("view", {
                    id: doc.id,
                    folderId: doc.folderId ?? doc.folder?.id ?? undefined,
                  } as DocumentType) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("actions.versionHistory")}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                  <DeletionErrorBoundary>
                    <DeletionStatusBadge
                      documentId={doc.id}
                      expiresAt={
                        doc.deletionExpiresAt
                          ? new Date(doc.deletionExpiresAt)
                          : null
                      }
                    />
                  </DeletionErrorBoundary>
                  <DeletionErrorBoundary>
                    <DeletionActions
                      documentId={doc.id}
                      documentName={doc.name}
                      onDeleted={() => onDocumentDeleted?.(doc.id)}
                    />
                  </DeletionErrorBoundary>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ISO Metadata Edit Dialog */}
      <IsoMetadataEditDialog
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        document={selectedDocumentForMetadata}
        onSaved={() => {
          if (selectedDocumentForMetadata) {
            onDocumentMetadataUpdated?.(selectedDocumentForMetadata.id);
            setSelectedDocumentForMetadata(null);
          }
        }}
      />
    </div>
  );
}
