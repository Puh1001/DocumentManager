"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  clientFilesApi,
  type ClientFileItem,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientFileViewer } from "@/components/client/client-file-viewer";
import { Eye, FileText } from "lucide-react";
import { useCanAccess } from "@/hooks/use-can-access";
import { formatFileSize, formatDateShort } from "@/lib/utils";

export function BossClientTab() {
  const tClient = useTranslations("client");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const canViewClient = useCanAccess("view", "Client");

  const [files, setFiles] = useState<ClientFileItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFile, setViewFile] = useState<ClientFileItem | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientFilesApi.getList({
        page: 1,
        limit: 20,
      });
      setFiles(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error("Failed to load client files for boss:", err);
      setError(getErrorMessage(err, (key: string) => tErrors(key)));
    } finally {
      setLoading(false);
    }
  }, [tErrors]);

  useEffect(() => {
    if (canViewClient) {
      void loadFiles();
    }
  }, [canViewClient, loadFiles]);

  if (!canViewClient) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-cyber font-semibold text-cyan-300">
            {tClient("title")}
          </h2>
          <p className="text-sm text-cyan-200/80">
            {tClient("description")}
          </p>
        </div>
        <p className="text-xs text-cyan-200/70">
          {total != null
            ? tClient("paginationSummary", {
                from: files.length > 0 ? 1 : 0,
                to: files.length,
                total,
              })
            : null}
        </p>
      </div>

      <div className="cyber-card cyber-corner p-4 bg-cyan-500/5 border border-cyan-500/20">
        {loading ? (
          <div className="py-8 text-center text-cyan-200">
            {tCommon("status.loading")}
          </div>
        ) : error ? (
          <div className="py-4 text-center text-fuchsia-300">
            {error}
          </div>
        ) : files.length === 0 ? (
          <div className="py-8 text-center text-cyan-200/80">
            {tClient("empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-500/20 text-cyan-300/80">
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-medium"
                  >
                    {tClient("table.name")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-medium"
                  >
                    {tClient("table.type")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-medium"
                  >
                    {tClient("table.size")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-medium"
                  >
                    {tClient("table.uploadedBy")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-medium"
                  >
                    {tClient("table.date")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-medium"
                  >
                    {tClient("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="border-b border-cyan-500/10 hover:bg-cyan-500/5"
                  >
                    <td className="px-3 py-2 font-medium text-cyan-50">
                      {file.name}
                    </td>
                    <td className="px-3 py-2 text-cyan-200/80">
                      <span className="inline-flex rounded bg-cyan-500/10 px-2 py-0.5 text-xs">
                        .{file.fileType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-cyan-200/80">
                      {formatFileSize(file.fileSize)}
                    </td>
                    <td className="px-3 py-2 text-cyan-200/80">
                      {file.uploadedBy ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-cyan-200/80">
                      {formatDateShort(file.uploadedAt ?? file.createdAt, locale)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-cyan-200 hover:text-cyan-50"
                        onClick={() => setViewFile(file)}
                        aria-label={tClient("viewFileAction", { name: file.name })}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={!!viewFile}
        onOpenChange={(open) => {
          if (!open) {
            setViewFile(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewFile?.name ?? ""}
            </DialogTitle>
            <DialogDescription>
              {viewFile?.fileName ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {viewFile && (
              <ClientFileViewer
                fileId={viewFile.id}
                fileType={viewFile.fileType}
                fileName={viewFile.fileName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

