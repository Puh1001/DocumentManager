import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SubjectType } from "@prisma/client";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { name: "asc" },
    });
  }

  async findPermissionById(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw CustomException.notFound(
        ErrorCodes.PERMISSION.NOT_FOUND,
        `Permission with ID ${id} not found`
      );
    }

    return permission;
  }

  async findPermissionByName(name: string) {
    return this.prisma.permission.findUnique({
      where: { name },
    });
  }

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw CustomException.notFound(
        ErrorCodes.PERMISSION.ROLE_NOT_FOUND,
        `Role with ID ${roleId} not found`
      );
    }

    return {
      role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw CustomException.notFound(
        ErrorCodes.PERMISSION.ROLE_NOT_FOUND,
        `Role with ID ${roleId} not found`
      );
    }

    // Verify permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw CustomException.badRequest(
        ErrorCodes.PERMISSION.PERMISSIONS_NOT_FOUND,
        "One or more permissions not found"
      );
    }

    // Delete existing permissions and assign new ones
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      ...permissionIds.map((permissionId) =>
        this.prisma.rolePermission.create({
          data: { roleId, permissionId },
        })
      ),
    ]);

    return this.getRolePermissions(roleId);
  }

  async getFolderPermissions(folderId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        permissions: {
          include: {
            permission: true,
            user: true,
            role: true,
          },
        },
      },
    });

    if (!folder) {
      throw CustomException.notFound(
        ErrorCodes.PERMISSION.FOLDER_NOT_FOUND,
        `Folder with ID ${folderId} not found`
      );
    }

    return {
      folder,
      permissions: folder.permissions.map((fp) => ({
        id: fp.id,
        subjectType: fp.subjectType,
        subjectId: fp.subjectId,
        subject: fp.subjectType === "USER" ? fp.user : fp.role,
        permission: fp.permission,
        inherit: fp.inherit,
      })),
    };
  }

  async setFolderPermissions(
    folderId: string,
    permissions: Array<{
      subjectType: SubjectType;
      subjectId: string;
      permissionId: string;
      inherit?: boolean;
    }>
  ) {
    // Verify folder exists
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw CustomException.notFound(
        ErrorCodes.PERMISSION.FOLDER_NOT_FOUND,
        `Folder with ID ${folderId} not found`
      );
    }

    // Verify all subjects exist
    for (const perm of permissions) {
      if (perm.subjectType === "USER") {
        const user = await this.prisma.user.findUnique({
          where: { id: perm.subjectId },
        });
        if (!user) {
          throw CustomException.badRequest(
            ErrorCodes.PERMISSION.USER_NOT_FOUND,
            `User with ID ${perm.subjectId} not found`
          );
        }
      } else if (perm.subjectType === "ROLE") {
        const role = await this.prisma.role.findUnique({
          where: { id: perm.subjectId },
        });
        if (!role) {
          throw CustomException.badRequest(
            ErrorCodes.PERMISSION.ROLE_NOT_FOUND,
            `Role with ID ${perm.subjectId} not found`
          );
        }
      }

      // Verify permission exists
      const permission = await this.prisma.permission.findUnique({
        where: { id: perm.permissionId },
      });
      if (!permission) {
        throw CustomException.badRequest(
          ErrorCodes.PERMISSION.PERMISSIONS_NOT_FOUND,
          `Permission with ID ${perm.permissionId} not found`
        );
      }
    }

    // Delete existing permissions and create new ones
    await this.prisma.$transaction([
      this.prisma.folderPermission.deleteMany({
        where: { folderId },
      }),
      ...permissions.map((perm) =>
        this.prisma.folderPermission.create({
          data: {
            folderId,
            subjectType: perm.subjectType,
            subjectId: perm.subjectId,
            permissionId: perm.permissionId,
            inherit: perm.inherit ?? true,
          },
        })
      ),
    ]);

    return this.getFolderPermissions(folderId);
  }

  async getDocumentPermissions(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        permissions: {
          include: {
            permission: true,
            user: true,
            role: true,
          },
        },
      },
    });

    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.PERMISSION.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }

    return {
      document,
      permissions: document.permissions.map((dp) => ({
        id: dp.id,
        subjectType: dp.subjectType,
        subjectId: dp.subjectId,
        subject: dp.subjectType === "USER" ? dp.user : dp.role,
        permission: dp.permission,
      })),
    };
  }

  async setDocumentPermissions(
    documentId: string,
    permissions: Array<{
      subjectType: SubjectType;
      subjectId: string;
      permissionId: string;
    }>
  ) {
    // Verify document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw CustomException.notFound(
        ErrorCodes.PERMISSION.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }

    // Verify all subjects and permissions exist
    for (const perm of permissions) {
      if (perm.subjectType === "USER") {
        const user = await this.prisma.user.findUnique({
          where: { id: perm.subjectId },
        });
        if (!user) {
          throw CustomException.badRequest(
            ErrorCodes.PERMISSION.USER_NOT_FOUND,
            `User with ID ${perm.subjectId} not found`
          );
        }
      } else if (perm.subjectType === "ROLE") {
        const role = await this.prisma.role.findUnique({
          where: { id: perm.subjectId },
        });
        if (!role) {
          throw CustomException.badRequest(
            ErrorCodes.PERMISSION.ROLE_NOT_FOUND,
            `Role with ID ${perm.subjectId} not found`
          );
        }
      }

      const permission = await this.prisma.permission.findUnique({
        where: { id: perm.permissionId },
      });
      if (!permission) {
        throw CustomException.badRequest(
          ErrorCodes.PERMISSION.PERMISSIONS_NOT_FOUND,
          `Permission with ID ${perm.permissionId} not found`
        );
      }
    }

    // Delete existing permissions and create new ones
    await this.prisma.$transaction([
      this.prisma.documentPermission.deleteMany({
        where: { documentId },
      }),
      ...permissions.map((perm) =>
        this.prisma.documentPermission.create({
          data: {
            documentId,
            subjectType: perm.subjectType,
            subjectId: perm.subjectId,
            permissionId: perm.permissionId,
          },
        })
      ),
    ]);

    return this.getDocumentPermissions(documentId);
  }
}
