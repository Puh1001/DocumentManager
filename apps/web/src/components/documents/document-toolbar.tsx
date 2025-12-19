"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw, FolderOpen, MapPin, RotateCw } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  path: string;
  physicalLocation: string | null;
}

interface DocumentToolbarProps {
  folder: Folder | null;
  onUpload: (file: File) => void;
  onRefresh: () => void;
  onSync?: () => Promise<void>;
}

export function DocumentToolbar({
  folder,
  onUpload,
  onRefresh,
  onSync,
}: DocumentToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  };

  const handleOpenFolder = async () => {
    if (!folder) return;

    try {
      const response = await fetch(
        `/api/storage/folders/${folder.id}/open-path`
      );
      const data = await response.json();

      // Copy to clipboard
      await navigator.clipboard.writeText(data.networkPath);
      alert(
        `Đường dẫn đã được sao chép:\n${data.networkPath}\n\nDán vào Windows Explorer (Win+E) để mở thư mục.`
      );
    } catch (error) {
      console.error("Failed to get folder path:", error);
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
      <div>
        {folder && (
          <div>
            <h2 className="text-lg font-semibold">{folder.name}</h2>
            {folder.physicalLocation && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Vị trí: {folder.physicalLocation}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
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
            {isSyncing ? "Đang sync..." : "Sync với file system"}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>

        {folder && (
          <>
            <Button variant="outline" size="sm" onClick={handleOpenFolder}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Mở thư mục
            </Button>

            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
            />
          </>
        )}
      </div>
    </div>
  );
}
