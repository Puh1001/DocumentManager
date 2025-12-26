import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { SubjectType, Prisma } from "@prisma/client";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { CreatePermissionDto } from "../dto/create-permission.dto";
import { UpdatePermissionDto } from "../dto/update-permission.dto";

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

  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[],
    userId?: string
  ) {
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

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "PERMISSION_CHANGE",
            resourceType: "Role",
            resourceId: roleId,
            details: {
              type: "role_permissions",
              permissionIds,
            },
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

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
    }>,
    userId?: string
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

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "PERMISSION_CHANGE",
            resourceType: "Folder",
            resourceId: folderId,
            details: {
              type: "folder_permissions",
              permissions: permissions.map((p) => ({
                subjectType: p.subjectType,
                subjectId: p.subjectId,
                permissionId: p.permissionId,
                inherit: p.inherit,
              })),
            },
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

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
    }>,
    userId?: string
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

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "PERMISSION_CHANGE",
            resourceType: "Document",
            resourceId: documentId,
            details: {
              type: "document_permissions",
              permissions: permissions.map((p) => ({
                subjectType: p.subjectType,
                subjectId: p.subjectId,
                permissionId: p.permissionId,
              })),
            },
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return this.getDocumentPermissions(documentId);
  }

  async create(dto: CreatePermissionDto, userId?: string) {
    // Check if permission name exists
    const existing = await this.findPermissionByName(dto.name);

    if (existing) {
      throw CustomException.conflict(
        ErrorCodes.PERMISSION.NAME_EXISTS,
        `Permission with name ${dto.name} already exists`
      );
    }

    const permission = await (
      this.prisma as PrismaClientLike
    ).permission.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "CREATE",
            resourceType: "Permission",
            resourceId: permission.id,
            details: {
              name: permission.name,
              description: permission.description,
            },
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto, userId?: string) {
    const permission = await this.findPermissionById(id);

    // Check if new name conflicts
    if (dto.name && dto.name !== permission.name) {
      const existing = await this.findPermissionByName(dto.name);

      if (existing) {
        throw CustomException.conflict(
          ErrorCodes.PERMISSION.NAME_EXISTS,
          `Permission with name ${dto.name} already exists`
        );
      }
    }

    const updated = await (this.prisma as PrismaClientLike).permission.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "UPDATE",
            resourceType: "Permission",
            resourceId: id,
            details: {
              changes: dto,
              previous: {
                name: permission.name,
                description: permission.description,
              },
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return updated;
  }

  async delete(id: string, userId?: string) {
    const permission = await this.findPermissionById(id);

    // Check if permission is in use
    const [rolePerms, folderPerms, docPerms] = await Promise.all([
      (this.prisma as PrismaClientLike).rolePermission.count({
        where: { permissionId: id },
      }),
      (this.prisma as PrismaClientLike).folderPermission.count({
        where: { permissionId: id },
      }),
      (this.prisma as PrismaClientLike).documentPermission.count({
        where: { permissionId: id },
      }),
    ]);

    const totalUsage = rolePerms + folderPerms + docPerms;

    if (totalUsage > 0) {
      throw CustomException.badRequest(
        ErrorCodes.PERMISSION.IN_USE,
        `Cannot delete permission: ${permission.name} is used by ${rolePerms} roles, ${folderPerms} folders, and ${docPerms} documents`
      );
    }

    await (this.prisma as PrismaClientLike).permission.delete({
      where: { id },
    });

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "DELETE",
            resourceType: "Permission",
            resourceId: id,
            details: {
              name: permission.name,
              description: permission.description,
            },
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return { message: "Permission deleted successfully" };
  }
}
