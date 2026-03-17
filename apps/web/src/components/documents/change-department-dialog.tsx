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
import { getErrorMessage } from "@/lib/error-handler";

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

  useEffect(() => {
    if (open) {
      loadDepartments();
      setSelectedDepartmentId("");
      setError(null);
    }
  }, [open, loadDepartments]);

  const handleSubmit = async () => {
    if (!document?.id || !selectedDepartmentId) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.patch(`/storage/documents/${document.id}/department`, {
        departmentId: selectedDepartmentId,
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

  const canSubmit = Boolean(document?.id && selectedDepartmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            <p className="text-xs text-muted-foreground">
              {t("changeDepartment.hint")}
            </p>
          </div>

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
