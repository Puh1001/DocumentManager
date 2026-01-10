import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { createMongoAbility, AbilityBuilder } from "@casl/ability";
import { AppAbility, Actions } from "../types/ability.types";
import {
  PERMISSION_ACTIONS,
  PERMISSION_SUBJECTS,
} from "../constants/permissions.constants";

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

interface KpiPermission {
  permissionName: string;
  action: Actions;
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

    // Load module and KPI permissions together (optimized: single query)
    const { modulePerms, kpiPerms } = await this.loadModuleAndKpiPermissions(
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

    // Apply KPI permissions (for KPI attachment access)
    for (const perm of kpiPerms) {
      // Apply to "Kpi" subject - permissions are stored as "action:Kpi" format
      can(perm.action, "Kpi");
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

  /**
   * Load module and KPI permissions together (optimized: single query)
   * Parses permissions in "action:Subject" format (e.g., "view:User", "download:Kpi")
   * @param userId - User ID (currently unused but kept for consistency)
   * @param roleIds - Array of role IDs assigned to user
   * @param moduleNames - Set of valid module names from database
   * @returns Object containing module and KPI permissions
   */
  private async loadModuleAndKpiPermissions(
    userId: string,
    roleIds: string[],
    moduleNames: Set<string>
  ): Promise<{ modulePerms: ModulePermission[]; kpiPerms: KpiPermission[] }> {
    if (roleIds.length === 0) {
      return { modulePerms: [], kpiPerms: [] };
    }

    // Load all permissions assigned to user's roles (single query)
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
      },
      include: {
        permission: true,
      },
    });

    const modulePerms: ModulePermission[] = [];
    const kpiPerms: KpiPermission[] = [];

    // Module permissions use these actions
    const moduleValidActions: string[] = [
      PERMISSION_ACTIONS.VIEW,
      PERMISSION_ACTIONS.MANAGE,
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.EDIT,
      PERMISSION_ACTIONS.DELETE,
    ];

    // KPI permissions use these actions
    const kpiValidActions: string[] = [
      PERMISSION_ACTIONS.VIEW,
      PERMISSION_ACTIONS.DOWNLOAD,
      PERMISSION_ACTIONS.PRINT,
      PERMISSION_ACTIONS.COPY,
      PERMISSION_ACTIONS.EDIT,
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.DELETE,
    ];

    // Parse permissions that match "action:Subject" pattern
    for (const rp of rolePermissions) {
      const parsed = this.parsePermissionName(rp.permission.name);

      if (!parsed) continue;

      const { action, subject } = parsed;

      // Check for module permissions (e.g., "view:User", "manage:Department")
      if (
        moduleValidActions.includes(action) &&
        moduleNames.has(subject)
      ) {
        modulePerms.push({
          permissionName: rp.permission.name,
          action: action as Actions,
          module: subject,
        });
      }

      // Check for KPI permissions (e.g., "view:Kpi", "download:Kpi")
      if (
        kpiValidActions.includes(action) &&
        subject === PERMISSION_SUBJECTS.KPI
      ) {
        kpiPerms.push({
          permissionName: rp.permission.name,
          action: action as Actions,
        });
      }
    }

    return { modulePerms, kpiPerms };
  }

  /**
   * Parse permission name in "action:Subject" format
   * @param permName - Permission name (e.g., "view:User", "download:Kpi")
   * @returns Parsed action and subject, or null if format is invalid
   */
  private parsePermissionName(
    permName: string
  ): { action: string; subject: string } | null {
    const parts = permName.split(":");

    if (parts.length !== 2) {
      return null;
    }

    const [action, subject] = parts;
    return { action, subject };
  }
}
