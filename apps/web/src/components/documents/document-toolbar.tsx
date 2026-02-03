"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw, RotateCw } from "lucide-react";
import {
  type DocumentLevel,
  getDocumentLevelDisplayName,
} from "@/lib/types/document.types";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface DocumentToolbarProps {
  statusFilter: string;
  departmentFilter: string;
  levelFilter: string;
  onStatusChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  departments: Department[];
  levels: DocumentLevel[];
  levelsLoading?: boolean;
  locale: string;
  onUpload: (file: File) => void;
  onRefresh: () => void;
  onSync?: () => Promise<void>;
  /** Departments allowed for upload (everyone selects one); when length > 1 show selector */
  uploadDepartments?: Department[];
  selectedDepartmentIdForUpload?: string;
  onUploadDepartmentChange?: (departmentId: string) => void;
}

export function DocumentToolbar({
  statusFilter,
  departmentFilter,
  levelFilter,
  onStatusChange,
  onDepartmentChange,
  onLevelChange,
  departments,
  levels,
  levelsLoading = false,
  locale,
  onUpload,
  onRefresh,
  onSync,
  uploadDepartments,
  selectedDepartmentIdForUpload,
  onUploadDepartmentChange,
}: DocumentToolbarProps) {
  const t = useTranslations("documents.toolbar");
  const tFilters = useTranslations("documents.filters");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  };

  const handleSync = async () => {
    if (!onSync) return;

    setIsSyncing(true);
    try {
      await onSync();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="status-filter"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {tFilters("status")}:
          </label>
          <select
            id="status-filter"
            aria-label={tFilters("status")}
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">{tFilters("all")}</option>
            <option value="ACTIVE">{tFilters("statusActive")}</option>
            <option value="ARCHIVED">{tFilters("statusArchived")}</option>
            <option value="DELETED">{tFilters("statusDeleted")}</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="department-filter"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {tFilters("department")}:
          </label>
          <select
            id="department-filter"
            aria-label={tFilters("department")}
            value={departmentFilter}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[8rem]"
          >
            <option value="">{tFilters("all")}</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="level-filter"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {tFilters("level")}:
          </label>
          <select
            id="level-filter"
            aria-label={tFilters("level")}
            value={levelFilter}
            onChange={(e) => onLevelChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[8rem]"
            disabled={levelsLoading}
          >
            {levelsLoading ? (
              <option value="">{tFilters("loadingLevels")}</option>
            ) : (
              <option value="">{tFilters("levelAll")}</option>
            )}
            {!levelsLoading &&
              levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {getDocumentLevelDisplayName(level, locale)}
                </option>
              ))}
          </select>
        </div>
        {onSync && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RotateCw
              className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? t("syncing") : t("sync")}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("refresh")}
        </Button>

        {uploadDepartments &&
          uploadDepartments.length > 1 &&
          onUploadDepartmentChange && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="upload-department"
                className="text-sm text-muted-foreground whitespace-nowrap"
              >
                {t("uploadToDepartment")}:
              </label>
              <select
                id="upload-department"
                aria-label={t("uploadToDepartment")}
                value={selectedDepartmentIdForUpload ?? ""}
                onChange={(e) => onUploadDepartmentChange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[8rem]"
              >
                {uploadDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadDepartments?.length === 0}
        >
          <Upload className="h-4 w-4 mr-2" />
          {t("upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
        />
      </div>
    </div>
  );
}
