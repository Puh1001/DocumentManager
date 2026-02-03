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
import { findDocumentsFolderNode } from "./folder-picker-utils";

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
  /** Called with folderId and levelId when user confirms. Level is required for upload. */
  onSelect: (folderId: string, levelId: string) => void;
  /** When set, only folders of this department are shown. Required for ISO upload (everyone selects department). */
  departmentId?: string | null;
  /** When true, show only the Documents (ISO_documents) folder of the department. */
  documentsOnly?: boolean;
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  onSelect,
  departmentId,
  documentsOnly = false,
}: FolderPickerDialogProps) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
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
    } else {
      setSelectedFolderId(null);
      setSelectedLevelId("");
      lastAutoSelectFoldersLength.current = 0;
    }
  }, [open, loadFolders]);

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

  const canConfirm = Boolean(selectedFolderId && selectedLevelId);

  const handleSelect = () => {
    if (selectedFolderId && selectedLevelId) {
      onSelect(selectedFolderId, selectedLevelId);
      onOpenChange(false);
      setSelectedFolderId(null);
      setSelectedLevelId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("upload.selectFolder")}</DialogTitle>
          <DialogDescription>
            {t("upload.selectFolderDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <LevelSelector
            value={selectedLevelId}
            onChange={setSelectedLevelId}
            required
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 py-4">
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

        <DialogFooter>
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
