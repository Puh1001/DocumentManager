"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api, departmentApi, type Department } from "@/lib/api";
import type { Document } from "@/lib/types/document.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FolderTree } from "./folder-tree";
import { findDocumentsFolderNode } from "./folder-picker-utils";
import { getErrorMessage } from "@/lib/error-handler";

interface Folder {
  id: string;
  name: string;
  path: string;
  physicalLocation: string | null;
  children: Folder[];
}

interface ChangeDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Pick<Document, "id" | "name" | "folder"> | null;
  onSuccess?: () => void;
}

export function ChangeDepartmentDialog({
  open,
  onOpenChange,
  document,
  onSuccess,
}: ChangeDepartmentDialogProps) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    try {
      const data = await departmentApi.getAll();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    }
  }, [tCommon]);

  const loadFolders = useCallback(async (departmentId: string) => {
    if (!departmentId) {
      setFolders([]);
      setSelectedFolderId(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const tree = await api.get<Folder[]>(
        `/storage/folders/tree?departmentId=${encodeURIComponent(departmentId)}`
      );
      const raw = tree || [];
      const docNode = findDocumentsFolderNode(raw);
      const result =
        docNode != null
          ? [{ ...docNode, name: t("upload.documentsFolder") }]
          : [];
      setFolders(result);
      setSelectedFolderId(null);
    } catch (err) {
      console.error("Failed to load folders:", err);
      setFolders([]);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [t, tCommon]);

  useEffect(() => {
    if (open) {
      loadDepartments();
      setSelectedDepartmentId("");
      setFolders([]);
      setSelectedFolderId(null);
      setError(null);
    }
  }, [open, loadDepartments]);

  useEffect(() => {
    if (open && selectedDepartmentId) {
      loadFolders(selectedDepartmentId);
    } else if (open && !selectedDepartmentId) {
      setFolders([]);
      setSelectedFolderId(null);
    }
  }, [open, selectedDepartmentId, loadFolders]);

  const handleSubmit = async () => {
    if (!document?.id || !selectedFolderId) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.patch(`/storage/documents/${document.id}/department`, {
        folderId: selectedFolderId,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to change department:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(document?.id && selectedFolderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("changeDepartment.title")}</DialogTitle>
          <DialogDescription>
            {t("changeDepartment.description", {
              document: document?.name ?? "",
              current: document?.folder?.department?.name ?? "—",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="department-select">
              {t("changeDepartment.targetDepartment")}
            </Label>
            <select
              id="department-select"
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t("changeDepartment.selectDepartment")}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {selectedDepartmentId && (
            <div className="space-y-2">
              <Label>{t("changeDepartment.targetFolder")}</Label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : folders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  {t("upload.noFolders")}
                </p>
              ) : (
                <FolderTree
                  folders={folders}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                />
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? tCommon("saving") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
