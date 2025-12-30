import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { createMongoAbility, AbilityBuilder } from "@casl/ability";
import { AppAbility, Actions } from "../types/ability.types";

interface FolderPermission {
  folderId: string;
  action: Actions;
  inherit: boolean;
}

interface DocumentPermission {
  documentId: string;
  action: Actions;
}

interface ModulePermission {
  permissionName: string;
  action: Actions;
  module: string;
}

@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(
    userId: string,
    userRoles: string[]
  ): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Admin has full access
    if (userRoles.includes("admin")) {
      can("manage", "all");
      return build();
    }

    // Boss has read-only access to all resources
    if (userRoles.includes("boss")) {
      can("view", "all");
      can("download", "all");
      can("print", "all");
      // Boss can view all folders and documents without explicit permissions
      return build();
    }

    // Load user roles
    const roleIds = await this.loadRoleIds(userRoles);

    // Load active modules from database for dynamic validation (load once, reuse)
    const activeModules = await this.prisma.module.findMany({
      where: { isActive: true },
      select: { name: true },
    });
    const moduleNames = new Set(activeModules.map((m) => m.name));

    // Load module permissions (for page access control) - pass moduleNames to avoid duplicate query
    const modulePerms = await this.loadModulePermissions(
      userId,
      roleIds,
      moduleNames
    );

    // Load folder permissions (both user and role-based)
    const folderPerms = await this.loadFolderPermissions(userId, roleIds);

    // Load document permissions (both user and role-based)
    const docPerms = await this.loadDocumentPermissions(userId, roleIds);

    // Apply module permissions (for page access)
    for (const perm of modulePerms) {
      // Validate module exists in database
      if (moduleNames.has(perm.module)) {
        // Module name is validated against database, safe to cast to Subjects
        // Using type assertion because module names are dynamically loaded from DB
        // @ts-expect-error - Module names are validated at runtime, type system can't know all possible modules
        can(perm.action, perm.module);
      }
    }

    // Apply folder permissions
    for (const perm of folderPerms) {
      can(perm.action as Actions, "Folder", { id: perm.folderId });

      // If inheritance is enabled, apply to documents in this folder
      if (perm.inherit) {
        can(perm.action as Actions, "Document", { folderId: perm.folderId });
      }
    }

    // Apply document permissions (override folder permissions)
    for (const perm of docPerms) {
      can(perm.action as Actions, "Document", { id: perm.documentId });
    }

    return build();
  }

  private async loadRoleIds(roleNames: string[]): Promise<string[]> {
    if (roleNames.length === 0) return [];

    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames } },
      select: { id: true },
    });

    return roles.map((r) => r.id);
  }

  private async loadFolderPermissions(
    userId: string,
    roleIds: string[]
  ): Promise<FolderPermission[]> {
    const permissions = await this.prisma.folderPermission.findMany({
      where: {
        OR: [
          { subjectType: "USER", subjectId: userId },
          { subjectType: "ROLE", subjectId: { in: roleIds } },
        ],
      },
      include: {
        permission: true,
        folder: true,
      },
    });

    return permissions.map((p) => ({
      folderId: p.folderId,
      action: p.permission.name as Actions,
      inherit: p.inherit,
    }));
  }

  private async loadDocumentPermissions(
    userId: string,
    roleIds: string[]
  ): Promise<DocumentPermission[]> {
    const permissions = await this.prisma.documentPermission.findMany({
      where: {
        OR: [
          { subjectType: "USER", subjectId: userId },
          { subjectType: "ROLE", subjectId: { in: roleIds } },
        ],
      },
      include: {
        permission: true,
      },
    });

    return permissions.map((p) => ({
      documentId: p.documentId,
      action: p.permission.name as Actions,
    }));
  }

  private async loadModulePermissions(
    userId: string,
    roleIds: string[],
    moduleNames: Set<string>
  ): Promise<ModulePermission[]> {
    if (roleIds.length === 0) return [];

    // Load all permissions assigned to user's roles
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
      },
      include: {
        permission: true,
      },
    });

    const modulePerms: ModulePermission[] = [];
    const validActions = ["view", "manage", "create", "edit", "delete"];

    // Parse permissions that match module pattern (e.g., "view:User", "manage:Department")
    for (const rp of rolePermissions) {
      const permName = rp.permission.name;
      const parts = permName.split(":");

      if (parts.length === 2) {
        const [action, module] = parts;
        // Validate action and module dynamically from database
        if (validActions.includes(action) && moduleNames.has(module)) {
          modulePerms.push({
            permissionName: permName,
            action: action as Actions,
            module,
          });
        }
      }
    }

    return modulePerms;
  }
}
