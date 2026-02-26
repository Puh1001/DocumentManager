"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageGuard } from "@/components/page-guard";
import { useCanAccess } from "@/hooks/use-can-access";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-handler";
import {
  clientFilesApi,
  type ClientFileItem,
  type ListClientFilesResponse,
} from "@/lib/api";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { registerPage } from "@/lib/page-registry";
import {
  Search,
  Upload,
  Trash2,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ClientFileViewer } from "@/components/client/client-file-viewer";
import { formatFileSize, formatDateShort } from "@/lib/utils";

export const pageMetadata: PageMetadata = {
  path: "/dashboard/client",
  name: "Client Files",
  module: "Client",
  action: "view",
  icon: "FolderOpen",
  order: 7,
  requiresAuth: true,
};

registerPage(pageMetadata);

const FILE_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "DOC" },
  { value: "docx", label: "DOCX" },
  { value: "xls", label: "XLS" },
  { value: "xlsx", label: "XLSX" },
  { value: "ppt", label: "PPT" },
  { value: "pptx", label: "PPTX" },
];

const ACCEPT_UPLOAD =
  ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf";

export default function ClientPage() {
  const t = useTranslations("client");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const { toast } = useToast();
  const canCreate = useCanAccess("create", "Client");
  const canDelete = useCanAccess("delete", "Client");

  const [data, setData] = useState<ListClientFilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [fileType, setFileType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewFile, setViewFile] = useState<ClientFileItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await clientFilesApi.getList({
        search: search || undefined,
        fileType: fileType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit,
      });
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, tErrors));
    } finally {
      setLoading(false);
    }
  }, [search, fileType, dateFrom, dateTo, page, limit, tErrors]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      await clientFilesApi.upload(file);
      toast({ title: t("uploadSuccess"), variant: "default" });
      fetchList();
    } catch (err) {
      toast({
        title: t("uploadError"),
        description: getErrorMessage(err, tErrors),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await clientFilesApi.delete(id);
      setDeleteId(null);
      toast({ title: t("deleteSuccess"), variant: "default" });
      fetchList();
    } catch (err) {
      toast({
        title: t("deleteError"),
        description: getErrorMessage(err, tErrors),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <PageGuard metadata={pageMetadata}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          {canCreate && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_UPLOAD}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={handleUploadClick}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? tCommon("status.loading") : t("upload")}
              </Button>
            </>
          )}
        </div>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-1 gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("searchPlaceholder")}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="secondary">
                  {tCommon("actions.search")}
                </Button>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={fileType}
                  onChange={(e) => {
                    setFileType(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {FILE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-[140px]"
                  placeholder={t("dateFrom")}
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-[140px]"
                  placeholder={t("dateTo")}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">
                {tCommon("status.loading")}
              </p>
            ) : !data?.data.length ? (
              <p className="py-8 text-center text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t("table.name")}
                      </th>
                      <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t("table.type")}
                      </th>
                      <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t("table.size")}
                      </th>
                      <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t("table.uploadedBy")}
                      </th>
                      <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t("table.date")}
                      </th>
                      <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t("table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-4 font-medium">{row.name}</td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs">
                            .{row.fileType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatFileSize(row.fileSize)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.uploadedBy ?? "—"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDateShort(row.uploadedAt ?? row.createdAt, locale)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewFile(row)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(row.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data && data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {t("paginationSummary", {
                    total: data.total,
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, data.total),
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View modal */}
        <Dialog open={!!viewFile} onOpenChange={(open) => !open && setViewFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {viewFile?.name ?? ""}
              </DialogTitle>
              <DialogDescription>{viewFile?.fileName}</DialogDescription>
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

        {/* Delete confirm */}
        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
              <DialogDescription>{t("deleteConfirmMessage")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                {tCommon("actions.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={() => deleteId && handleDelete(deleteId)}
              >
                {deleting ? tCommon("status.loading") : t("deleteConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
