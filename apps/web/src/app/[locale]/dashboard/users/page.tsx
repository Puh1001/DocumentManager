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
import {
  userApi,
  roleApi,
  departmentApi,
  type User,
  type Role,
  type Department,
  type CreateUserDto,
  type UpdateUserDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/error-handler";
import { PageGuard } from "@/components/page-guard";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { registerPage } from "@/lib/page-registry";

export const pageMetadata: PageMetadata = {
  path: "/dashboard/users",
  name: "User Management",
  module: "User",
  action: "view",
  icon: "Users",
  order: 5,
  requiresAuth: true,
};

// Register page metadata
registerPage(pageMetadata);

export default function UsersPage() {
  const t = useTranslations();
  const tUsers = useTranslations("users");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<User | null>(
    null
  );
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    department: "", // Legacy field
    selectedDepartmentIds: [] as string[], // NEW: Multi-department support
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const isAdmin = user?.roles?.includes("admin") ?? false;

  const loadUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const response = await userApi.getAll({
          page,
          limit,
          search: searchTerm || undefined,
        });
        setUsers(response.data);
        setTotalPages(response.totalPages);
        setTotal(response.total);
        setCurrentPage(page);
      } catch (err) {
        console.error(err);
        setError(getErrorMessage(err, (key: string) => t(key)));
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, t]
  );

  const loadRoles = useCallback(async () => {
    try {
      const response = await roleApi.getAll({ limit: 100 });
      setRoles(response.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const data = await departmentApi.getAll();
      setDepartments(data);
      return data;
    } catch (err) {
      console.error("Failed to load departments:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  useEffect(() => {
    if (isAdmin) {
      loadRoles();
      loadDepartments();
    }
  }, [isAdmin, loadRoles, loadDepartments]);

  const handleOpenUserDialog = async (user?: User) => {
    // Load departments if not already loaded
    let departmentsList = departments;
    if (departmentsList.length === 0) {
      departmentsList = await loadDepartments();
    }

    if (user) {
      setEditingUser(user);
      
      // NEW: Load user's departments from API
      let selectedDepartmentIds: string[] = [];
      try {
        const userDepartments = await userApi.getDepartments(user.id);
        selectedDepartmentIds = userDepartments.map((d) => d.id);
      } catch (err) {
        console.error("Failed to load user departments:", err);
        // Fallback: try to match from legacy department field
        if (user.department) {
          const matchedDept = departmentsList.find(
            (d) =>
              d.code.toLowerCase() === user.department?.toLowerCase() ||
              d.name.toLowerCase() === user.department?.toLowerCase()
          );
          if (matchedDept) {
            selectedDepartmentIds = [matchedDept.id];
          }
        }
      }

      // Legacy: Try to find matching department by code or name
      let departmentCode = "";
      if (user.department) {
        const matchedDept = departmentsList.find(
          (d) =>
            d.code.toLowerCase() === user.department?.toLowerCase() ||
            d.name.toLowerCase() === user.department?.toLowerCase() ||
            d.nameVi?.toLowerCase() === user.department?.toLowerCase() ||
            d.nameEn?.toLowerCase() === user.department?.toLowerCase() ||
            d.nameZh?.toLowerCase() === user.department?.toLowerCase()
        );
        if (matchedDept) {
          departmentCode = matchedDept.code;
        } else {
          departmentCode = user.department;
        }
      }
      
      setFormData({
        username: user.username,
        email: user.email,
        password: "",
        fullName: user.fullName,
        department: departmentCode,
        selectedDepartmentIds,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        email: "",
        password: "",
        fullName: "",
        department: "",
        selectedDepartmentIds: [],
      });
    }
    setIsUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setIsUserDialogOpen(false);
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      fullName: "",
      department: "",
      selectedDepartmentIds: [],
    });
  };

  const handleOpenRoleDialog = async (user: User) => {
    try {
      // Refresh user data to get latest roles
      const updatedUser = await userApi.getById(user.id);
      setSelectedUserForRoles(updatedUser);
      setIsRoleDialogOpen(true);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    }
  };

  const handleCloseRoleDialog = () => {
    setIsRoleDialogOpen(false);
    setSelectedUserForRoles(null);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Update user basic info
        const updateData: UpdateUserDto = {
          email: formData.email,
          fullName: formData.fullName,
          department: formData.department || undefined, // Legacy field
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await userApi.update(editingUser.id, updateData);
        
        // NEW: Update departments separately
        if (formData.selectedDepartmentIds.length > 0) {
          await userApi.assignDepartments(
            editingUser.id,
            formData.selectedDepartmentIds
          );
        }
      } else {
        // Create new user
        const createData: CreateUserDto = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          department: formData.department || undefined, // Legacy field
        };
        const newUser = await userApi.create(createData);
        
        // NEW: Assign departments after user creation
        if (formData.selectedDepartmentIds.length > 0) {
          await userApi.assignDepartments(
            newUser.id,
            formData.selectedDepartmentIds
          );
        }
      }
      await loadUsers(currentPage);
      handleCloseUserDialog();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tUsers("errors.deleteConfirm"))) {
      return;
    }

    try {
      await userApi.delete(id);
      await loadUsers(currentPage);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t("errors.deleteFailed");
      setError(errorMessage);
    }
  };

  const handleReactivate = async (id: string) => {
    if (!confirm("Kích hoạt lại tài khoản này?")) {
      return;
    }

    try {
      await userApi.reactivate(id);
      await loadUsers(currentPage);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    }
  };

  const handleHardDelete = async (id: string) => {
    if (
      !confirm(
        "Xóa vĩnh viễn tài khoản này? Hành động này không thể hoàn tác."
      )
    ) {
      return;
    }

    try {
      await userApi.hardDelete(id);
      await loadUsers(currentPage);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t("errors.deleteFailed");
      setError(errorMessage);
    }
  };

  const handleAssignRole = async (roleId: string) => {
    if (!selectedUserForRoles) return;

    try {
      await userApi.assignRole(selectedUserForRoles.id, roleId);
      // Refresh user data to get updated roles
      const updatedUser = await userApi.getById(selectedUserForRoles.id);
      setSelectedUserForRoles(updatedUser);
      await loadUsers(currentPage);
      await loadRoles();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!selectedUserForRoles) return;

    try {
      await userApi.removeRole(selectedUserForRoles.id, roleId);
      // Refresh user data to get updated roles
      const updatedUser = await userApi.getById(selectedUserForRoles.id);
      setSelectedUserForRoles(updatedUser);
      await loadUsers(currentPage);
      await loadRoles();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, (key: string) => t(key)));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    loadUsers(1);
  };

  if (loading && users.length === 0) {
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
            <h1 className="text-3xl font-bold">{tUsers("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {tUsers("description")}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => handleOpenUserDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {tUsers("add")}
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
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={tUsers("searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <Button type="submit" variant="outline">
                  {tCommon("actions.search")}
                </Button>
              </div>
            </form>

            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {tUsers("empty")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {tUsers("table.username")}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {tUsers("table.fullName")}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {tUsers("table.email")}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {tUsers("table.department")}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {tUsers("table.roles")}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {tUsers("table.status")}
                      </th>
                      {isAdmin && (
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                          {tUsers("table.actions")}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{user.username}</td>
                        <td className="py-3 px-4">{user.fullName}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">
                          {user.departments && user.departments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.departments.slice(0, 3).map((dept: Department) => (
                                <span
                                  key={dept.id}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                                  title={dept.name}
                                >
                                  {dept.code || dept.name}
                                </span>
                              ))}
                              {user.departments.length > 3 && (
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                                  title={user.departments
                                    .slice(3)
                                    .map((d: Department) => d.name)
                                    .join(", ")}
                                >
                                  +{user.departments.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {user.department || "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {role.name}
                              </span>
                            ))}
                            {user.roles.length === 0 && (
                              <span className="text-muted-foreground text-xs">
                                -
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.isActive
                              ? tUsers("status.active")
                              : tUsers("status.inactive")}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              {user.isActive ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenUserDialog(user)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenRoleDialog(user)}
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(user.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReactivate(user.id)}
                                  >
                                    <Plus className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleHardDelete(user.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {tUsers("pagination.showing", {
                    from: (currentPage - 1) * limit + 1,
                    to: Math.min(currentPage * limit, total),
                    total,
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadUsers(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => loadUsers(page)}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadUsers(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* User Create/Edit Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmitUser}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser
                    ? tUsers("form.updateTitle")
                    : tUsers("form.createTitle")}
                </DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? tUsers("form.updateDescription")
                    : tUsers("form.createDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {!editingUser && (
                  <div className="grid gap-2">
                    <Label htmlFor="username">{tUsers("form.username")}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder={tUsers("form.usernamePlaceholder")}
                      required
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="email">{tUsers("form.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder={tUsers("form.emailPlaceholder")}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">
                    {tUsers("form.password")}
                    {editingUser && (
                      <span className="text-muted-foreground text-xs ml-2">
                        ({tUsers("form.passwordOptional")})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={tUsers("form.passwordPlaceholder")}
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">{tUsers("form.fullName")}</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder={tUsers("form.fullNamePlaceholder")}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="departments">
                    {tUsers("form.departments") || "Departments"}
                  </Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                    {departments.filter((dept) => dept.isActive).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {tUsers("form.noDepartments") || "No departments available"}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {departments
                          .filter((dept) => dept.isActive)
                          .map((dept) => (
                            <label
                              key={dept.id}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={formData.selectedDepartmentIds.includes(
                                  dept.id
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      selectedDepartmentIds: [
                                        ...formData.selectedDepartmentIds,
                                        dept.id,
                                      ],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selectedDepartmentIds:
                                        formData.selectedDepartmentIds.filter(
                                          (id) => id !== dept.id
                                        ),
                                    });
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">
                                {dept.name} ({dept.code})
                              </span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                  {formData.selectedDepartmentIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.selectedDepartmentIds.map((deptId) => {
                        const dept = departments.find((d) => d.id === deptId);
                        if (!dept) return null;
                        return (
                          <span
                            key={deptId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                          >
                            {dept.name}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  selectedDepartmentIds:
                                    formData.selectedDepartmentIds.filter(
                                      (id) => id !== deptId
                                    ),
                                });
                              }}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseUserDialog}
                  disabled={isSubmitting}
                >
                  {tCommon("actions.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? tUsers("form.processing")
                    : editingUser
                      ? tUsers("form.update")
                      : tUsers("form.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Role Assignment Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{tUsers("roles.title")}</DialogTitle>
              <DialogDescription>
                {selectedUserForRoles &&
                  tUsers("roles.description", {
                    name: selectedUserForRoles.fullName,
                  })}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedUserForRoles && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">
                      {tUsers("roles.currentRoles")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedUserForRoles.roles.length === 0 ? (
                        <span className="text-muted-foreground text-sm">
                          {tUsers("roles.noRoles")}
                        </span>
                      ) : (
                        selectedUserForRoles.roles.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            <span>{role.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRole(role.id)}
                              className="hover:text-blue-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      {tUsers("roles.assignRole")}
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {roles
                        .filter(
                          (role) =>
                            !selectedUserForRoles.roles.some(
                              (ur) => ur.id === role.id
                            )
                        )
                        .map((role) => (
                          <div
                            key={role.id}
                            className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleAssignRole(role.id)}
                          >
                            <div>
                              <div className="font-medium">{role.name}</div>
                              {role.description && (
                                <div className="text-xs text-muted-foreground">
                                  {role.description}
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      {roles.filter(
                        (role) =>
                          !selectedUserForRoles.roles.some(
                            (ur) => ur.id === role.id
                          )
                      ).length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-4">
                          {tUsers("roles.allRolesAssigned")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseRoleDialog}
              >
                {tCommon("actions.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
