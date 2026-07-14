"use client";

import { useTranslations } from "next-intl";
import { formatDateShort } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, Download, History, ExternalLink, FileEdit, Building2 } from "lucide-react";
import { useAbility } from "@/hooks/use-ability";
import { useDeletionStatus } from "@/hooks/use-deletion-status";
import { useAuth } from "@/lib/auth-context";
import { deletionRequestApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Document as DocumentType } from "@/lib/types/ability.types";
import type { Document, DocumentLevel } from "@/lib/types/document.types";
import { getRevisionLabelFromVersionCount } from "@iso-docs/shared";
import { DeletionStatusBadge } from "./deletion-status-badge";
import { DeletionActions } from "./deletion-actions";
import { DeletionErrorBoundary } from "./deletion-error-boundary";
import { IsoMetadataEditDialog } from "./iso-metadata-edit-dialog";
import { ChangeDepartmentDialog } from "./change-department-dialog";
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
  /** When true, show Change Department action (DCC/admin only) */
  canChangeDepartment?: boolean;
}

export function DocumentList({
  documents,
  locale = "en",
  onDocumentClick,
  onDocumentDeleted,
  onDocumentMetadataUpdated,
  canChangeDepartment = false,
}: DocumentListProps) {
  const t = useTranslations("documents.list");
  const { ability } = useAbility();
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [selectedDocumentForMetadata, setSelectedDocumentForMetadata] =
    useState<Document | null>(null);
  const [changeDeptDialogOpen, setChangeDeptDialogOpen] = useState(false);
  const [selectedDocumentForDept, setSelectedDocumentForDept] =
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
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onDocumentClick?.(doc)}
            >
              <td className="py-3 px-4 text-sm">
                {doc.documentNo?.trim() || PLACEHOLDER}
              </td>
              <td className="py-3 px-4">
                <p className="font-medium">{doc.name}</p>
              </td>
              <td className="py-3 px-4 text-sm">
                {doc.revisionLabel?.trim() ||
                  getRevisionLabelFromVersionCount(doc._count?.versions ?? 1)}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {getLevelDisplayName(doc.level, locale)}
              </td>
              <td className="py-3 px-4 text-sm">
                {doc.folder?.department?.name ?? PLACEHOLDER}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {doc.preparerName?.trim() || PLACEHOLDER}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {doc.reviewerName?.trim() || PLACEHOLDER}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {doc.approverName?.trim() || PLACEHOLDER}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDateOrPlaceholder(doc.approvalDate, locale)}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDateOrPlaceholder(doc.receiptDate, locale)}
              </td>
              <td
                className="py-3 px-4 text-sm text-muted-foreground max-w-[12rem] truncate"
                title={doc.storageLocation ?? undefined}
              >
                {doc.storageLocation?.trim() ?? PLACEHOLDER}
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
                  {canChangeDepartment && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("actions.changeDepartment")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocumentForDept(doc);
                        setChangeDeptDialogOpen(true);
                      }}
                    >
                      <Building2 className="h-4 w-4" />
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
                  <DocumentDeletionControls
                    document={doc}
                    onDeleted={onDocumentDeleted}
                  />
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

      {/* Change Department Dialog (DCC/admin only) */}
      <ChangeDepartmentDialog
        open={changeDeptDialogOpen}
        onOpenChange={(open) => {
          setChangeDeptDialogOpen(open);
          if (!open) setSelectedDocumentForDept(null);
        }}
        document={selectedDocumentForDept}
        onSuccess={() => {
          if (selectedDocumentForDept) {
            onDocumentMetadataUpdated?.(selectedDocumentForDept.id);
            setSelectedDocumentForDept(null);
          }
        }}
      />
    </div>
  );
}

interface DocumentDeletionControlsProps {
  document: Document;
  onDeleted?: (documentId: string) => void;
}

function DocumentDeletionControls({
  document,
  onDeleted,
}: DocumentDeletionControlsProps) {
  const { status, loading, refetch } = useDeletionStatus(document.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [restoring, setRestoring] = useState(false);

  const isDccOrAdmin = user?.roles?.some((r) => r === "dcc" || r === "admin") ?? false;
  const isDeleted = document.status === "DELETED";

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await deletionRequestApi.restoreDocument(document.id);
      toast({ title: "Document restored successfully" });
      onDeleted?.(document.id);
    } catch (err) {
      console.error("Restore failed", err);
      toast({ title: "Failed to restore document", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <DeletionErrorBoundary>
        <DeletionStatusBadge
          documentId={document.id}
          expiresAt={
            document.deletionExpiresAt
              ? new Date(document.deletionExpiresAt)
              : null
          }
          status={status}
          loading={loading}
        />
      </DeletionErrorBoundary>
      <DeletionErrorBoundary>
        <DeletionActions
          documentId={document.id}
          documentName={document.name}
          status={status}
          loading={loading}
          refetchStatus={refetch}
          onDeleted={() => onDeleted?.(document.id)}
        />
      </DeletionErrorBoundary>
      {isDeleted && isDccOrAdmin && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={restoring}
          className="ml-2 h-7 text-xs"
        >
          {restoring ? "Restoring..." : "Restore"}
        </Button>
      )}
    </>
  );
}
