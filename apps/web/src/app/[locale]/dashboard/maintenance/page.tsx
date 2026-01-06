"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CalendarDays, Megaphone, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMaintenanceNotices } from "@/hooks/use-maintenance-notices";
import {
  api,
  type Department,
  type MaintenanceNotice,
  getDepartmentName,
} from "@/lib/api";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { registerPage } from "@/lib/page-registry";
import { PageGuard } from "@/components/page-guard";
import { getErrorMessage } from "@/lib/error-handler";

export const pageMetadata: PageMetadata = {
  path: "/dashboard/maintenance",
  name: "Maintenance Notices",
  module: "Maintenance",
  action: "view",
  icon: "Wrench",
  order: 8,
  requiresAuth: true,
};

// Register page metadata
registerPage(pageMetadata);

interface FormState {
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  departmentId: string;
}

const initialForm: FormState = {
  title: "",
  startDate: "",
  endDate: "",
  description: "",
  departmentId: "",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function MaintenancePage() {
  const t = useTranslations("maintenance");
  const commonT = useTranslations("common");
  const errorT = useTranslations("errors");
  const locale = useLocale();
  const { notices, addNotice, updateNotice, deleteNotice, loading } =
    useMaintenanceNotices();
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await api.get<Department[]>("/departments");
        setDepartments(data);
      } catch (err) {
        console.error("Failed to load departments", err);
      } finally {
        setLoadingDepartments(false);
      }
    };
    loadDepartments();
  }, []);

  const sortedNotices = useMemo(
    () => [...notices].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [notices]
  );

  const getNoticeDepartmentName = (notice: MaintenanceNotice) => {
    // When the related department is already loaded on the notice, use its name directly.
    // The embedded `department` object only includes a subset of fields (id, name, code),
    // so we avoid passing it to `getDepartmentName` which expects a full `Department` type.
    if (notice.department) {
      return notice.department.name;
    }

    // When we only have departmentId, look it up from the full departments list
    // and use `getDepartmentName` to respect the current locale.
    if (notice.departmentId) {
      const dept = departments.find((d) => d.id === notice.departmentId);
      return dept ? getDepartmentName(dept, locale) : t("list.allDepartments");
    }

    return t("list.allDepartments");
  };

  const handleEdit = (notice: MaintenanceNotice) => {
    setForm({
      title: notice.title,
      startDate: notice.startDate.split("T")[0], // Extract date part
      endDate: notice.endDate.split("T")[0], // Extract date part
      description: notice.description || "",
      departmentId: notice.departmentId ?? "",
    });
    setEditingId(notice.id);
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setForm(initialForm);
    setEditingId(null);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotice(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete notice", err);
      setFormError(getErrorMessage(err, errorT));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // Trim title to handle whitespace-only input
    const trimmedTitle = form.title.trim();

    if (!trimmedTitle || !form.startDate || !form.endDate) {
      setFormError(t("form.validationRequired"));
      return;
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError(t("form.validationDate"));
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: form.description || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      departmentId: form.departmentId || undefined,
    };

    try {
      if (editingId) {
        await updateNotice(editingId, payload);
        setEditingId(null);
      } else {
        await addNotice(payload);
      }
      setForm(initialForm);
    } catch (err) {
      console.error("Failed to save notice", err);
      // Use proper error handler to show translated error messages
      setFormError(getErrorMessage(err, errorT));
    }
  };

  return (
    <PageGuard metadata={pageMetadata}>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("pageTitle")}
          </h1>
          <p className="text-muted-foreground">{t("pageDescription")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{t("form.sectionTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("form.helper")}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="title">{t("form.titleLabel")}</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder={t("form.titleLabel")}
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentId">
                    {t("form.departmentLabel")}
                  </Label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={form.departmentId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        departmentId: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled={loadingDepartments}
                  >
                    <option value="">{t("form.allDepartments")}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t("form.startLabel")}</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t("form.endLabel")}</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("form.detailsLabel")}</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={t("form.detailsLabel")}
                  />
                </div>

                {formError ? (
                  <p className="text-sm text-destructive">{formError}</p>
                ) : null}

                <div className="flex justify-end gap-2">
                  {editingId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={loading}
                    >
                      {t("actions.cancel")}
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={loading}>
                    {editingId ? t("actions.save") : t("form.submit")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{t("list.sectionTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("pageDescription")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  {commonT("status.loading")}
                </p>
              ) : sortedNotices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("list.empty")}
                </p>
              ) : (
                sortedNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold">{notice.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("list.department")}: {getNoticeDepartmentName(notice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("list.windowLabel")}:{" "}
                          {formatDate(notice.startDate)} -{" "}
                          {formatDate(notice.endDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(notice)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(notice.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {notice.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {notice.description}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={deleteConfirmId !== null}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteConfirm.title")}</DialogTitle>
              <DialogDescription>
                {t("deleteConfirm.message")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                {t("deleteConfirm.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                {t("deleteConfirm.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
