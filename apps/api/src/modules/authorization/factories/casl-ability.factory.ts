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

    // Load user roles
    const roleIds = await this.loadRoleIds(userRoles);

    // Load folder permissions (both user and role-based)
    const folderPerms = await this.loadFolderPermissions(userId, roleIds);

    // Load document permissions (both user and role-based)
    const docPerms = await this.loadDocumentPermissions(userId, roleIds);

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
}
