"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
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
import { departmentApi, type Department, getDepartmentName } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/error-handler";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { registerPage } from "@/lib/page-registry";
import { PageGuard } from "@/components/page-guard";

export const pageMetadata: PageMetadata = {
  path: "/dashboard/departments",
  name: "Department Management",
  module: "Department",
  action: "view",
  icon: "Building2",
  order: 6,
  requiresAuth: true,
};

// Register page metadata
registerPage(pageMetadata);

export default function DepartmentsPage() {
  const t = useTranslations();
  const tDept = useTranslations("departments");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    nameVi: "",
    nameZh: "",
    code: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.roles?.includes("admin") ?? false;

  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await departmentApi.getAll();
      setDepartments(data);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleOpenDialog = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name || "",
        nameEn: department.nameEn || "",
        nameVi: department.nameVi || "",
        nameZh: department.nameZh || "",
        code: department.code,
        isActive: department.isActive,
      });
    } else {
      setEditingDepartment(null);
      setFormData({
        name: "",
        nameEn: "",
        nameVi: "",
        nameZh: "",
        code: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
    setFormData({
      name: "",
      nameEn: "",
      nameVi: "",
      nameZh: "",
      code: "",
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare data with multilingual fields
      const submitData = {
        code: formData.code,
        nameEn: formData.nameEn || undefined,
        nameVi: formData.nameVi || undefined,
        nameZh: formData.nameZh || undefined,
        name: formData.name || formData.nameVi || undefined, // Fallback to nameVi or name
        isActive: formData.isActive,
      };

      if (editingDepartment) {
        await departmentApi.update(editingDepartment.id, submitData);
      } else {
        await departmentApi.create(submitData);
      }
      await loadDepartments();
      handleCloseDialog();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tDept("errors.deleteConfirm"))) {
      return;
    }

    try {
      await departmentApi.delete(id);
      await loadDepartments();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t("errors.deleteFailed");
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PageGuard metadata={pageMetadata}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{tDept("title")}</h1>
            <p className="text-muted-foreground mt-1">{tDept("description")}</p>
          </div>
          {isAdmin && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {tDept("add")}
            </Button>
          )}
        </div>

        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        <Card>
          <div className="p-6">
            {departments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {tDept("empty")}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((dept) => (
                    <Card key={dept.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {getDepartmentName(dept, locale)}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {tDept("code")}: {dept.code}
                          </p>
                          {(dept.nameEn || dept.nameVi || dept.nameZh) && (
                            <div className="mt-2 space-y-1">
                              {dept.nameEn && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">EN:</span> {dept.nameEn}
                                </p>
                              )}
                              {dept.nameVi && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">VI:</span> {dept.nameVi}
                                </p>
                              )}
                              {dept.nameZh && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">ZH:</span> {dept.nameZh}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                dept.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {dept.isActive
                                ? tDept("active")
                                : tDept("inactive")}
                            </span>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(dept)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(dept.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment
                    ? tDept("form.updateTitle")
                    : tDept("form.createTitle")}
                </DialogTitle>
                <DialogDescription>
                  {editingDepartment
                    ? tDept("form.updateDescription")
                    : tDept("form.createDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">{tDept("code")}</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder={tDept("form.codePlaceholder")}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nameEn">Department Name (English)</Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    placeholder="Example: General Manager's Office"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nameVi">Department Name (Vietnamese)</Label>
                  <Input
                    id="nameVi"
                    value={formData.nameVi}
                    onChange={(e) =>
                      setFormData({ ...formData, nameVi: e.target.value })
                    }
                    placeholder="Example: Ban Giám Đốc"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nameZh">Department Name (Chinese)</Label>
                  <Input
                    id="nameZh"
                    value={formData.nameZh}
                    onChange={(e) =>
                      setFormData({ ...formData, nameZh: e.target.value })
                    }
                    placeholder="Example: 总经办"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">{tDept("form.name")} (Legacy/Backward Compatibility)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={tDept("form.namePlaceholder")}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    {tDept("form.isActive")}
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  {tCommon("actions.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? tDept("form.processing")
                    : editingDepartment
                      ? tDept("form.update")
                      : tDept("form.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
