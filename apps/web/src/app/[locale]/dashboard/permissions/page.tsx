"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  roleApi,
  permissionApi,
  moduleApi,
  type Role,
  type Permission,
  type Module,
  type CreateRoleDto,
  type UpdateRoleDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/error-handler";
import { PageGuard } from "@/components/page-guard";
import {
  Shield,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Settings,
  Search,
  Check,
  Filter,
  Grid3x3,
  List,
  X,
} from "lucide-react";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { registerPage } from "@/lib/page-registry";

export const pageMetadata: PageMetadata = {
  path: "/dashboard/permissions",
  name: "Permission Management",
  module: "Permission",
  action: "view",
  icon: "Shield",
  order: 9,
  requiresAuth: true,
};

// Register page metadata
registerPage(pageMetadata);

export default function PermissionsPage() {
  const t = useTranslations();
  const tPerms = useTranslations("permissions");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [groupByModule, setGroupByModule] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isPermissionFormDialogOpen, setIsPermissionFormDialogOpen] =
    useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null
  );
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [rolesWithPermissions, setRolesWithPermissions] = useState<
    Map<string, Role[]>
  >(new Map());
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [permissionFormData, setPermissionFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isAdmin = user?.roles?.includes("admin") ?? false;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [permsData, rolesData, modulesData] = await Promise.all([
        permissionApi.getAll(),
        roleApi.getAll({ limit: 100 }),
        moduleApi.getAll(),
      ]);
      setPermissions(permsData);
      setRoles(rolesData.data);
      setModules(modulesData.filter((m) => m.isActive));

      // Load permissions for each role to compute usage
      const usageMap = new Map<string, Role[]>();
      for (const role of rolesData.data) {
        try {
          const roleWithPerms = await permissionApi.getRolePermissions(role.id);
          for (const perm of roleWithPerms.permissions) {
            if (!usageMap.has(perm.id)) {
              usageMap.set(perm.id, []);
            }
            usageMap.get(perm.id)!.push(role);
          }
        } catch (err) {
          // Skip if we can't load permissions for this role
          console.warn(`Failed to load permissions for role ${role.id}:`, err);
        }
      }
      setRolesWithPermissions(usageMap);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRoleDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || "",
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: "",
        description: "",
      });
    }
    setIsRoleDialogOpen(true);
  };

  const handleCloseRoleDialog = () => {
    setIsRoleDialogOpen(false);
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingRole) {
        const updateData: UpdateRoleDto = {
          name: formData.name,
          description: formData.description || undefined,
        };
        await roleApi.update(editingRole.id, updateData);
      } else {
        const createData: CreateRoleDto = {
          name: formData.name,
          description: formData.description || undefined,
        };
        await roleApi.create(createData);
      }
      await loadData();
      handleCloseRoleDialog();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm(tPerms("errors.deleteRoleConfirm"))) {
      return;
    }

    try {
      await roleApi.delete(id);
      await loadData();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t("errors.deleteFailed");
      setError(errorMessage);
    }
  };

  const handleOpenPermissionDialog = async (role: Role) => {
    setSelectedRole(role);
    try {
      const roleWithPerms = await permissionApi.getRolePermissions(role.id);
      setRolePermissions(roleWithPerms.permissions);
      setIsPermissionDialogOpen(true);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    }
  };

  const handleClosePermissionDialog = () => {
    setIsPermissionDialogOpen(false);
    setSelectedRole(null);
    setRolePermissions([]);
  };

  const handleTogglePermission = (permissionId: string) => {
    if (rolePermissions.some((p) => p.id === permissionId)) {
      setRolePermissions(rolePermissions.filter((p) => p.id !== permissionId));
    } else {
      const permission = permissions.find((p) => p.id === permissionId);
      if (permission) {
        setRolePermissions([...rolePermissions, permission]);
      }
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      await permissionApi.assignRolePermissions(selectedRole.id, {
        permissionIds: rolePermissions.map((p) => p.id),
      });
      await loadData();
      handleClosePermissionDialog();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPermissionFormDialog = (permission?: Permission) => {
    if (permission) {
      setEditingPermission(permission);
      setPermissionFormData({
        name: permission.name,
        description: permission.description || "",
      });
    } else {
      setEditingPermission(null);
      setPermissionFormData({
        name: "",
        description: "",
      });
    }
    setIsPermissionFormDialogOpen(true);
  };

  const handleClosePermissionFormDialog = () => {
    setIsPermissionFormDialogOpen(false);
    setEditingPermission(null);
    setPermissionFormData({
      name: "",
      description: "",
    });
  };

  const handleSubmitPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingPermission) {
        await permissionApi.update(editingPermission.id, {
          name: permissionFormData.name,
          description: permissionFormData.description || undefined,
        });
      } else {
        await permissionApi.create({
          name: permissionFormData.name,
          description: permissionFormData.description || undefined,
        });
      }
      await loadData();
      handleClosePermissionFormDialog();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePermission = async (id: string) => {
    const rolesUsingPermission = rolesWithPermissions.get(id) || [];
    if (rolesUsingPermission.length > 0) {
      const roleNames = rolesUsingPermission.map((r) => r.name).join(", ");
      alert(
        tPerms("errors.deletePermissionInUse", {
          roles: roleNames,
        })
      );
      return;
    }

    if (!confirm(tPerms("errors.deletePermissionConfirm"))) {
      return;
    }

    try {
      await permissionApi.delete(id);
      await loadData();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t("errors.deleteFailed");
      setError(errorMessage);
    }
  };

  const filteredRoles = roles.filter(
    (role) =>
      !searchTerm ||
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Extracts module name from permission name.
   *
   * Permission names follow the format: "action:Module" (e.g., "view:User", "create:Department").
   * Returns the module name part, or null if the format is invalid or module name is empty.
   *
   * @param permission - The permission object containing the name to parse
   * @returns The module name (e.g., "User", "Department") or null if not found/invalid
   *
   * @example
   * ```typescript
   * getModuleFromPermission({ name: "view:User" }) // Returns "User"
   * getModuleFromPermission({ name: "create:Department" }) // Returns "Department"
   * getModuleFromPermission({ name: "invalid" }) // Returns null
   * getModuleFromPermission({ name: "view:" }) // Returns null (empty module name)
   * ```
   */
  const getModuleFromPermission = (permission: Permission): string | null => {
    const parts = permission.name.split(":");
    if (parts.length >= 2 && parts[1]) {
      // Return first part after action (handles action:Module:SubModule by returning Module)
      return parts[1];
    }
    return null;
  };

  // Filter permissions by search term and module
  const filteredPermissions = useMemo(() => {
    let filtered = permissions.filter(
      (perm) =>
        !permissionSearchTerm ||
        perm.name.toLowerCase().includes(permissionSearchTerm.toLowerCase()) ||
        perm.description
          ?.toLowerCase()
          .includes(permissionSearchTerm.toLowerCase())
    );

    // Filter by module if selected
    if (selectedModule) {
      filtered = filtered.filter((perm) => {
        const moduleName = getModuleFromPermission(perm);
        return moduleName === selectedModule;
      });
    }

    return filtered;
  }, [permissions, permissionSearchTerm, selectedModule]);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    const otherGroup: Permission[] = [];

    filteredPermissions.forEach((perm) => {
      const moduleName = getModuleFromPermission(perm);
      if (moduleName) {
        if (!groups[moduleName]) {
          groups[moduleName] = [];
        }
        groups[moduleName].push(perm);
      } else {
        otherGroup.push(perm);
      }
    });

    // Sort modules alphabetically
    const sortedGroups: Record<string, Permission[]> = {};
    Object.keys(groups)
      .sort()
      .forEach((key) => {
        sortedGroups[key] = groups[key];
      });

    if (otherGroup.length > 0) {
      sortedGroups["Other"] = otherGroup;
    }

    return sortedGroups;
  }, [filteredPermissions]);

  // Get available modules from permissions
  const availableModules = useMemo(() => {
    const moduleSet = new Set<string>();
    permissions.forEach((perm) => {
      const moduleName = getModuleFromPermission(perm);
      if (moduleName) {
        moduleSet.add(moduleName);
      }
    });
    return Array.from(moduleSet).sort();
  }, [permissions]);

  if (loading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageGuard metadata={pageMetadata}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{tPerms("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {tPerms("description")}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button onClick={() => handleOpenPermissionFormDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {tPerms("addPermission")}
              </Button>
              <Button variant="outline" onClick={() => handleOpenRoleDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {tPerms("addRole")}
              </Button>
            </div>
          )}
        </div>

        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{tPerms("availablePermissions")}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {/* Group toggle */}
                <Button
                  variant={groupByModule ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGroupByModule(!groupByModule)}
                  title={groupByModule ? "List view" : "Group by module"}
                >
                  {groupByModule ? (
                    <List className="h-4 w-4" />
                  ) : (
                    <Grid3x3 className="h-4 w-4" />
                  )}
                </Button>
                {/* Module filter */}
                {availableModules.length > 0 && (
                  <div className="relative">
                    <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={selectedModule || ""}
                      onChange={(e) =>
                        setSelectedModule(e.target.value || null)
                      }
                      className="pl-8 pr-8 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">All Modules</option>
                      {availableModules.map((moduleName) => {
                        const module = modules.find(
                          (m) => m.name === moduleName
                        );
                        return (
                          <option key={moduleName} value={moduleName}>
                            {module?.displayName || moduleName}
                          </option>
                        );
                      })}
                    </select>
                    {selectedModule && (
                      <button
                        onClick={() => setSelectedModule(null)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        title="Clear filter"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                )}
                {/* Search */}
                {isAdmin && (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={tPerms("searchPermissions")}
                      value={permissionSearchTerm}
                      onChange={(e) => setPermissionSearchTerm(e.target.value)}
                      className="pl-8 w-48"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {selectedModule
                    ? tPerms("noPermissionsForModule", {
                        module:
                          modules.find((m) => m.name === selectedModule)
                            ?.displayName || selectedModule,
                      }) ||
                      `No permissions found for ${modules.find((m) => m.name === selectedModule)?.displayName || selectedModule}`
                    : permissionSearchTerm
                      ? tPerms("noPermissionsMatchingSearch") ||
                        "No permissions match your search"
                      : tPerms("noPermissions")}
                </p>
              ) : groupByModule ? (
                // Grouped view
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(
                    ([moduleName, modulePerms]) => {
                      const module = modules.find((m) => m.name === moduleName);
                      return (
                        <div key={moduleName} className="space-y-2">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <h3 className="font-semibold text-sm">
                              {module?.displayName || moduleName}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              ({modulePerms.length})
                            </span>
                          </div>
                          <div className="space-y-2 pl-2">
                            {modulePerms.map((perm) => {
                              const rolesUsingPermission =
                                rolesWithPermissions.get(perm.id) || [];
                              return (
                                <div
                                  key={perm.id}
                                  className="flex items-center justify-between p-3 rounded border hover:bg-muted/50"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">
                                      {perm.name}
                                    </p>
                                    {perm.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {perm.description}
                                      </p>
                                    )}
                                    {rolesUsingPermission.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        <span className="text-xs text-muted-foreground">
                                          {tPerms("usedBy")}:
                                        </span>
                                        {rolesUsingPermission.map((role) => (
                                          <span
                                            key={role.id}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                          >
                                            {role.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {isAdmin && (
                                    <div className="flex gap-2 ml-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleOpenPermissionFormDialog(perm)
                                        }
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDeletePermission(perm.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                // List view
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPermissions.map((perm) => {
                    const rolesUsingPermission =
                      rolesWithPermissions.get(perm.id) || [];
                    const moduleName = getModuleFromPermission(perm);
                    const module = moduleName
                      ? modules.find((m) => m.name === moduleName)
                      : null;
                    return (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between p-3 rounded border hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{perm.name}</p>
                            {moduleName && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {module?.displayName || moduleName}
                              </span>
                            )}
                          </div>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          )}
                          {rolesUsingPermission.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="text-xs text-muted-foreground">
                                {tPerms("usedBy")}:
                              </span>
                              {rolesUsingPermission.map((role) => (
                                <span
                                  key={role.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {role.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleOpenPermissionFormDialog(perm)
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePermission(perm.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{tPerms("roles")}</CardTitle>
              </div>
              {isAdmin && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={tPerms("searchRoles")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-48"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {tPerms("noRoles")}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 rounded border hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPermissionDialog(role)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRoleDialog(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tPerms("folderDocumentPermissions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {tPerms("folderDocumentPermissionsDescription")}
            </p>
          </CardContent>
        </Card>

        {/* Role Create/Edit Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmitRole}>
              <DialogHeader>
                <DialogTitle>
                  {editingRole
                    ? tPerms("form.updateRoleTitle")
                    : tPerms("form.createRoleTitle")}
                </DialogTitle>
                <DialogDescription>
                  {editingRole
                    ? tPerms("form.updateRoleDescription")
                    : tPerms("form.createRoleDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{tPerms("form.roleName")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={tPerms("form.roleNamePlaceholder")}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">
                    {tPerms("form.description")}
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={tPerms("form.descriptionPlaceholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseRoleDialog}
                  disabled={isSubmitting}
                >
                  {tCommon("actions.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? tPerms("form.processing")
                    : editingRole
                      ? tPerms("form.update")
                      : tPerms("form.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Permission Assignment Dialog */}
        <Dialog
          open={isPermissionDialogOpen}
          onOpenChange={setIsPermissionDialogOpen}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {tPerms("permissions.assignTitle")}
                {selectedRole && `: ${selectedRole.name}`}
              </DialogTitle>
              <DialogDescription>
                {tPerms("permissions.assignDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {tPerms("noPermissions")}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {permissions.map((permission) => {
                    const isSelected = rolePermissions.some(
                      (p) => p.id === permission.id
                    );
                    return (
                      <div
                        key={permission.id}
                        className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleTogglePermission(permission.id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {permission.name}
                            </p>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClosePermissionDialog}
                disabled={isSubmitting}
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? tPerms("form.processing")
                  : tCommon("actions.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permission Create/Edit Dialog */}
        <Dialog
          open={isPermissionFormDialogOpen}
          onOpenChange={setIsPermissionFormDialogOpen}
        >
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmitPermission}>
              <DialogHeader>
                <DialogTitle>
                  {editingPermission
                    ? tPerms("form.updatePermissionTitle")
                    : tPerms("form.createPermissionTitle")}
                </DialogTitle>
                <DialogDescription>
                  {editingPermission
                    ? tPerms("form.updatePermissionDescription")
                    : tPerms("form.createPermissionDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="permission-name">
                    {tPerms("form.permissionName")}
                  </Label>
                  <Input
                    id="permission-name"
                    value={permissionFormData.name}
                    onChange={(e) =>
                      setPermissionFormData({
                        ...permissionFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder={tPerms("form.permissionNamePlaceholder")}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="permission-description">
                    {tPerms("form.description")}
                  </Label>
                  <Input
                    id="permission-description"
                    value={permissionFormData.description}
                    onChange={(e) =>
                      setPermissionFormData({
                        ...permissionFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder={tPerms("form.descriptionPlaceholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClosePermissionFormDialog}
                  disabled={isSubmitting}
                >
                  {tCommon("actions.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? tPerms("form.processing")
                    : editingPermission
                      ? tPerms("form.update")
                      : tPerms("form.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
