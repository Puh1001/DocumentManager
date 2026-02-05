"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderTree } from "./folder-tree";
import { LevelSelector } from "./level-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerField } from "./date-picker-field";
import { findDocumentsFolderNode } from "./folder-picker-utils";
import { REVISION_LABEL_OPTIONS } from "@iso-docs/shared";

export interface UploadMetadata {
  /** Display name for the document (optional; when omitted, backend uses file basename). */
  name?: string;
  documentNo?: string;
  revisionLabel?: string;
  preparerName?: string;
  reviewerName?: string;
  approverName?: string;
  approvalDate?: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
  physicalLocation: string | null;
  children: Folder[];
}

interface FolderPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with folderId, levelId and optional metadata when user confirms. Level is required for upload. */
  onSelect: (
    folderId: string,
    levelId: string,
    metadata?: UploadMetadata
  ) => void;
  /** When set, only folders of this department are shown. Required for ISO upload (everyone selects department). */
  departmentId?: string | null;
  /** When true, show only the Documents (ISO_documents) folder of the department. */
  documentsOnly?: boolean;
  /** When true, show optional fields: preparer, reviewer, approver, approval date (user input at upload). */
  showUploadMetadata?: boolean;
  /** When provided (e.g. selected file name), used to pre-fill the document name field. */
  initialFileName?: string;
}

function basenameWithoutExt(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  onSelect,
  departmentId,
  documentsOnly = false,
  showUploadMetadata = false,
  initialFileName,
}: FolderPickerDialogProps) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const tMeta = useTranslations("documents.editMetadata");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [documentNo, setDocumentNo] = useState<string>("");
  const [revisionLabel, setRevisionLabel] = useState<string>("A/0");
  const [preparerName, setPreparerName] = useState<string>("");
  const [reviewerName, setReviewerName] = useState<string>("");
  const [approverName, setApproverName] = useState<string>("");
  const [approvalDate, setApprovalDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const lastAutoSelectFoldersLength = useRef<number>(0);

  const loadFolders = useCallback(async () => {
    if (documentsOnly && !departmentId) {
      setFolders([]);
      return;
    }
    try {
      setLoading(true);
      const params = departmentId
        ? `?departmentId=${encodeURIComponent(departmentId)}`
        : "";
      const tree = await api.get<Folder[]>(`/storage/folders/tree${params}`);
      const raw = tree || [];
      let result: Folder[];
      if (documentsOnly) {
        const docNode = findDocumentsFolderNode(raw);
        result =
          docNode != null
            ? [{ ...docNode, name: t("upload.documentsFolder") }]
            : [];
      } else {
        result = raw;
      }
      setFolders(result);
    } catch (error) {
      console.error("Failed to load folders:", error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId, documentsOnly, t]);

  useEffect(() => {
    if (open) {
      loadFolders();
      setDisplayName(
        initialFileName ? basenameWithoutExt(initialFileName) : ""
      );
    } else {
      setSelectedFolderId(null);
      setSelectedLevelId("");
      setDisplayName("");
      setDocumentNo("");
      setRevisionLabel("A/0");
      setPreparerName("");
      setReviewerName("");
      setApproverName("");
      setApprovalDate(null);
      lastAutoSelectFoldersLength.current = 0;
    }
  }, [open, loadFolders, initialFileName]);

  // Auto-select the single Documents folder when documentsOnly and we have exactly one node (run once per folders snapshot)
  useEffect(() => {
    if (
      documentsOnly &&
      folders.length === 1 &&
      lastAutoSelectFoldersLength.current !== 1
    ) {
      setSelectedFolderId(folders[0].id);
      lastAutoSelectFoldersLength.current = 1;
    } else if (folders.length !== 1) {
      lastAutoSelectFoldersLength.current = 0;
    }
  }, [documentsOnly, folders]);

  const metadataComplete = Boolean(
    documentNo.trim() &&
    preparerName.trim() &&
    reviewerName.trim() &&
    approverName.trim() &&
    approvalDate
  );
  const canConfirm = Boolean(
    selectedFolderId &&
    selectedLevelId &&
    (!showUploadMetadata || metadataComplete)
  );

  const handleSelect = () => {
    if (selectedFolderId && selectedLevelId) {
      const metadata: UploadMetadata | undefined = showUploadMetadata
        ? {
            name: displayName.trim() || undefined,
            documentNo: documentNo.trim() || undefined,
            revisionLabel: revisionLabel?.trim() || "A/0",
            preparerName: preparerName.trim() || undefined,
            reviewerName: reviewerName.trim() || undefined,
            approverName: approverName.trim() || undefined,
            approvalDate: approvalDate ? approvalDate.toISOString() : undefined,
          }
        : displayName.trim()
          ? { name: displayName.trim() }
          : undefined;
      onSelect(selectedFolderId, selectedLevelId, metadata);
      onOpenChange(false);
      setSelectedFolderId(null);
      setSelectedLevelId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-0">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t("upload.selectFolder")}</DialogTitle>
          <DialogDescription>
            {t("upload.selectFolderDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Single scrollable body: form + folder tree so footer always visible */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <div className="space-y-4">
            {initialFileName && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {t("upload.documentNameLabel")}
                </label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("upload.documentNamePlaceholder")}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("upload.documentNameHint")}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 font-medium">
                  {t("upload.documentNameRule")}
                </p>
              </div>
            )}
            <LevelSelector
              value={selectedLevelId}
              onChange={setSelectedLevelId}
              required
            />
            {showUploadMetadata && (
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("upload.metadataSectionTitle")}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {tMeta("documentNoLabel")}
                    </label>
                    <input
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase"
                      value={documentNo}
                      onChange={(e) => setDocumentNo(e.target.value)}
                      placeholder={tMeta("documentNoPlaceholder")}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {tMeta("documentNoHint")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {tMeta("revisionLabelLabel")}
                    </label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={revisionLabel}
                      onChange={(e) => setRevisionLabel(e.target.value)}
                    >
                      {REVISION_LABEL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tMeta("revisionLabelHint")}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">
                      {tMeta("preparer")}
                    </Label>
                    <Input
                      value={preparerName}
                      onChange={(e) => setPreparerName(e.target.value)}
                      placeholder={tMeta("preparerPlaceholder")}
                      className="w-full"
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                      {tMeta("fullNameRequired")}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">
                      {tMeta("reviewer")}
                    </Label>
                    <Input
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder={tMeta("reviewerPlaceholder")}
                      className="w-full"
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                      {tMeta("fullNameRequired")}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">
                      {tMeta("approver")}
                    </Label>
                    <Input
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder={tMeta("approverPlaceholder")}
                      className="w-full"
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                      {tMeta("fullNameRequired")}
                    </p>
                  </div>
                  <DatePickerField
                    label={tMeta("approvalDate")}
                    value={approvalDate}
                    onChange={setApprovalDate}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t("upload.noFolders")}
                </div>
              ) : (
                <FolderTree
                  folders={folders}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSelect} disabled={!canConfirm}>
            {tCommon("actions.select")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
