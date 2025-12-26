"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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
import { api, departmentApi, type Department } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-handler";

interface AssignDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  currentDepartmentId?: string | null;
  onSuccess?: () => void;
}

export function AssignDepartmentDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  currentDepartmentId,
  onSuccess,
}: AssignDepartmentDialogProps) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(
    currentDepartmentId || ""
  );
  const [loading, setLoading] = useState(false);
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
      setSelectedDepartmentId(currentDepartmentId || "");
    }
  }, [open, currentDepartmentId, loadDepartments]);

  const handleAssign = async () => {
    try {
      setLoading(true);
      setError(null);

      await api.patch(`/storage/folders/${folderId}`, {
        departmentId: selectedDepartmentId || null,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to assign department:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("assignDepartment.title", { folder: folderName })}
          </DialogTitle>
          <DialogDescription>
            {t("assignDepartment.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="department-select">
              {t("assignDepartment.department")}
            </Label>
            <select
              id="department-select"
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t("assignDepartment.none")}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? tCommon("saving") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
