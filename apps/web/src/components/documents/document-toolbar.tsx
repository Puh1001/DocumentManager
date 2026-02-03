"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Upload,
  RefreshCw,
  RotateCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
    <div className="space-y-3">
      {/* Filter Row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="status-filter"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {tFilters("status")}:
          </label>
          <div className="relative">
            <select
              id="status-filter"
              aria-label={tFilters("status")}
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 pr-8 py-1 text-sm text-foreground cursor-pointer transition-colors hover:border-input/80 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring appearance-none"
            >
              <option value="">{tFilters("all")}</option>
              <option value="ACTIVE">{tFilters("statusActive")}</option>
              <option value="ARCHIVED">{tFilters("statusArchived")}</option>
              <option value="DELETED">{tFilters("statusDeleted")}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="department-filter"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {tFilters("department")}:
          </label>
          <div className="relative">
            <select
              id="department-filter"
              aria-label={tFilters("department")}
              value={departmentFilter}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 pr-8 py-1 text-sm text-foreground cursor-pointer transition-colors hover:border-input/80 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring appearance-none min-w-[8rem]"
            >
              <option value="">{tFilters("all")}</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="level-filter"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {tFilters("level")}:
          </label>
          <div className="relative">
            <select
              id="level-filter"
              aria-label={tFilters("level")}
              value={levelFilter}
              onChange={(e) => onLevelChange(e.target.value)}
              disabled={levelsLoading}
              className="h-9 rounded-md border-2 border-foreground bg-background px-3 pr-8 py-1 text-sm text-foreground cursor-pointer transition-colors hover:border-foreground/80 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed appearance-none min-w-[8rem]"
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
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Sync Button */}
        {onSync && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9 rounded-md transition-colors cursor-pointer"
          >
            <RotateCw
              className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? t("syncing") : t("sync")}
          </Button>
        )}
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-9 rounded-md transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("refresh")}
        </Button>

        {/* Upload Section */}
        {uploadDepartments && uploadDepartments.length > 0 && (
          <>
            {uploadDepartments.length > 1 && onUploadDepartmentChange && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="upload-department"
                  className="text-sm text-muted-foreground whitespace-nowrap"
                >
                  {t("uploadToDepartment")}:
                </label>
                <div className="relative">
                  <select
                    id="upload-department"
                    aria-label={t("uploadToDepartment")}
                    value={selectedDepartmentIdForUpload ?? ""}
                    onChange={(e) => onUploadDepartmentChange(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 pr-8 py-1 text-sm text-foreground cursor-pointer transition-colors hover:border-input/80 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring appearance-none min-w-[8rem]"
                  >
                    {uploadDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronUp className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            {/* Upload Button - Primary Action */}
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDepartments.length === 0}
              className="h-9 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("upload")}
            </Button>
          </>
        )}
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
