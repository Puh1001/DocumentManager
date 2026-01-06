"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
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
import {
  moduleApi,
  permissionApi,
  type Module,
  type Permission,
  type CreateModuleDto,
  type UpdateModuleDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/error-handler";
import { PageGuard } from "@/components/page-guard";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Loader2,
  Search,
  X,
} from "lucide-react";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { registerPage } from "@/lib/page-registry";
import { useToast } from "@/hooks/use-toast";

export const pageMetadata: PageMetadata = {
  path: "/dashboard/modules",
  name: "Module Management",
  module: "Module",
  action: "view",
  icon: "Package",
  order: 10,
  requiresAuth: true,
};

// Register page metadata
registerPage(pageMetadata);

export default function ModulesPage() {
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const tModules = useTranslations("modules");
  const { user } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isAdmin = user?.roles?.includes("admin") ?? false;

  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await moduleApi.getAll();
      setModules(data);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadPermissions = useCallback(async () => {
    try {
      const data = await permissionApi.getAll();
      setPermissions(data);
    } catch (err) {
      console.error("Failed to load permissions:", err);
    }
  }, []);

  useEffect(() => {
    loadModules();
    loadPermissions();
  }, [loadModules, loadPermissions]);

  /**
   * Get all permissions for a specific module
   * @param moduleName - The module name to filter permissions by
   * @returns Array of permissions matching the module name pattern (action:module)
   */
  const getModulePermissions = useCallback(
    (moduleName: string): Permission[] => {
      return permissions.filter((perm) => {
        const parts = perm.name.split(":");
        return parts.length === 2 && parts[1] === moduleName;
      });
    },
    [permissions]
  );

  /**
   * Translate action name to current locale
   * @param action - Action name (create, delete, edit, manage, view)
   * @returns Translated action name or original if translation not found
   */
  const translateAction = useCallback(
    (action: string): string => {
      return tModules(`actions.${action}`) || action;
    },
    [tModules]
  );

  // Memoize permission map for all modules
  const modulePermissionsMap = useMemo(() => {
    const map = new Map<string, Permission[]>();
    modules.forEach((module) => {
      map.set(module.name, getModulePermissions(module.name));
    });
    return map;
  }, [modules, getModulePermissions]);

  const handleOpenDialog = (module?: Module) => {
    if (module) {
      setEditingModule(module);
      setFormData({
        name: module.name,
        displayName: module.displayName,
        description: module.description || "",
      });
    } else {
      setEditingModule(null);
      setFormData({
        name: "",
        displayName: "",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingModule(null);
    setFormData({
      name: "",
      displayName: "",
      description: "",
    });
  };

  /**
   * Handle form submission for create/update module
   * Auto-generates permissions when creating a new module
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingModule) {
        const updateData: UpdateModuleDto = {
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description || null,
        };
        await moduleApi.update(editingModule.id, updateData);
        toast({
          title: tModules("updateSuccess"),
          description: tModules("updateSuccessDesc"),
          variant: "success",
        });
      } else {
        const createData: CreateModuleDto = {
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description || undefined,
        };
        await moduleApi.create(createData);
        toast({
          title: tModules("createSuccess"),
          description: tModules("createSuccessDesc"),
          variant: "success",
        });
      }
      await loadModules();
      await loadPermissions();
      handleCloseDialog();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await moduleApi.delete(id);
      await loadModules();
      await loadPermissions();
      toast({
        title: tModules("deleteSuccess"),
        description: tModules("deleteSuccessDesc"),
        variant: "success",
      });
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
      setDeleteConfirmId(null);
    }
  };

  // Memoize filtered modules to avoid recalculating on every render
  const filteredModules = useMemo(() => {
    return modules.filter(
      (module) =>
        module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [modules, searchTerm]);

  if (loading && modules.length === 0) {
    return (
      <PageGuard metadata={pageMetadata}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard metadata={pageMetadata}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{tModules("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {tModules("description")}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {tModules("addModule")}
            </Button>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tModules("list")}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tModules("search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  aria-label="Search modules"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-6 w-6 p-0"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredModules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? tModules("noResults") : tModules("empty")}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredModules.map((module) => {
                  const modulePerms =
                    modulePermissionsMap.get(module.name) || [];
                  return (
                    <Card key={module.id} className="border">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <h3 className="text-lg font-semibold">
                                {module.displayName}
                              </h3>
                              <span className="text-sm text-muted-foreground">
                                ({module.name})
                              </span>
                              {!module.isActive && (
                                <span className="text-xs px-2 py-1 bg-muted rounded">
                                  {tModules("inactive")}
                                </span>
                              )}
                            </div>
                            {module.description && (
                              <p className="text-sm text-muted-foreground mb-4">
                                {module.description}
                              </p>
                            )}
                            <div className="mt-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {tModules("permissions")} (
                                  {modulePerms.length})
                                </span>
                              </div>
                              {modulePerms.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {modulePerms.map((perm) => {
                                    const [action] = perm.name.split(":");
                                    return (
                                      <span
                                        key={perm.id}
                                        className="text-xs px-2 py-1 bg-secondary rounded"
                                      >
                                        {translateAction(action)}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {tModules("noPermissions")}
                                </p>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDialog(module)}
                                aria-label={`Edit ${module.displayName}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteConfirmId(module.id)}
                                aria-label={`Delete ${module.displayName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingModule
                    ? tModules("editModule")
                    : tModules("createModule")}
                </DialogTitle>
                <DialogDescription>
                  {editingModule
                    ? tModules("editDescription")
                    : tModules("createDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {tModules("name")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="User"
                      required
                      disabled={!!editingModule}
                      pattern="^[A-Z][a-zA-Z0-9]*$"
                      title="PascalCase (start with uppercase, alphanumeric only)"
                    />
                    <p className="text-xs text-muted-foreground">
                      {tModules("nameHint")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">
                      {tModules("displayName")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          displayName: e.target.value,
                        })
                      }
                      placeholder="User Management"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {tModules("description")}
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="User management module"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isSubmitting}
                  >
                    {tCommon("cancel") || "Cancel"}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingModule
                      ? tCommon("save") || "Save"
                      : tCommon("create") || "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        {isAdmin && (
          <Dialog
            open={deleteConfirmId !== null}
            onOpenChange={(open) => !open && setDeleteConfirmId(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tModules("deleteConfirm")}</DialogTitle>
                <DialogDescription>
                  {tModules("deleteConfirmDesc")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isSubmitting}
                >
                  {tCommon("cancel") || "Cancel"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    deleteConfirmId && handleDelete(deleteConfirmId)
                  }
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {tModules("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageGuard>
  );
}
