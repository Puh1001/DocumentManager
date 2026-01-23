"use client";

import { useTranslations } from "next-intl";
import { formatFileSize, formatDate, getFileIcon } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, Download, History, ExternalLink, Pencil } from "lucide-react";
import { useAbility } from "@/hooks/use-ability";
import { Document as DocumentType } from "@/lib/types/ability.types";
import { DeletionStatusBadge } from "./deletion-status-badge";
import { DeletionActions } from "./deletion-actions";
import { DeletionErrorBoundary } from "./deletion-error-boundary";
import { RenameDocumentDialog } from "./rename-document-dialog";
import { fixFileNameEncoding } from "@/lib/utils/encoding-fix";
import { useState } from "react";

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  updatedAt: string;
  folderId?: string;
  deletionExpiresAt?: string | null;
}

interface DocumentListProps {
  documents: Document[];
  onDocumentClick?: (doc: Document) => void;
  folderId?: string | null;
  onDocumentDeleted?: (documentId: string) => void;
  onDocumentRenamed?: (documentId: string) => void;
}

export function DocumentList({
  documents,
  onDocumentClick,
  folderId,
  onDocumentDeleted,
  onDocumentRenamed,
}: DocumentListProps) {
  const t = useTranslations("documents.list");
  const { ability } = useAbility();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

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
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.name")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.type")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.size")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.updated")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Deletion Status
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
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(doc.fileType)}</span>
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fixFileNameEncoding(doc.fileName)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                  {doc.fileType.toUpperCase()}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatFileSize(doc.fileSize)}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDate(doc.updatedAt)}
              </td>
              <td className="py-3 px-4">
                <div onClick={(e) => e.stopPropagation()}>
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
                </div>
              </td>
              <td className="py-3 px-4">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ability?.can("view", {
                    id: doc.id,
                    folderId: doc.folderId || folderId || undefined,
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
                    folderId: doc.folderId || folderId || undefined,
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
                    folderId: doc.folderId || folderId || undefined,
                  } as DocumentType) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("actions.openToEdit")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDocument(doc);
                      setRenameDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {ability?.can("view", {
                    id: doc.id,
                    folderId: doc.folderId || folderId || undefined,
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
                    <DeletionActions
                      documentId={doc.id}
                      documentName={doc.name}
                      onDeleted={() => {
                        onDocumentDeleted?.(doc.id);
                      }}
                    />
                  </DeletionErrorBoundary>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Rename Dialog */}
      {selectedDocument && (
        <RenameDocumentDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          documentId={selectedDocument.id}
          currentName={selectedDocument.name}
          currentFileName={selectedDocument.fileName}
          onRenamed={() => {
            onDocumentRenamed?.(selectedDocument.id);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
}
