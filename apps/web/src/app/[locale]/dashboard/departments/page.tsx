"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
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
import { departmentApi, type Department } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/error-handler";
import { useCanAccess } from "@/hooks/use-can-access";
import { AccessDenied } from "@/components/access-denied";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function DepartmentsPage() {
  const t = useTranslations();
  const tDept = useTranslations("departments");
  const tCommon = useTranslations("common");
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
    code: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.roles?.includes("admin") ?? false;
  const canAccess = useCanAccess("view", "Department");

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
        name: department.name,
        code: department.code,
        isActive: department.isActive,
      });
    } else {
      setEditingDepartment(null);
      setFormData({
        name: "",
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
      code: "",
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingDepartment) {
        await departmentApi.update(editingDepartment.id, formData);
      } else {
        await departmentApi.create(formData);
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

  if (!canAccess) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
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
                        <h3 className="font-semibold text-lg">{dept.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tDept("code")}: {dept.code}
                        </p>
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
                <Label htmlFor="name">{tDept("form.name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={tDept("form.namePlaceholder")}
                  required
                />
              </div>
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
  );
}
