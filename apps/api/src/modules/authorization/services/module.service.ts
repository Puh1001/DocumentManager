import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { CreateModuleDto } from "../dto/create-module.dto";
import { UpdateModuleDto } from "../dto/update-module.dto";
import { PermissionService } from "./permission.service";

const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];

@Injectable()
export class ModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService
  ) {}

  async findAll() {
    return (this.prisma as PrismaClientLike).module.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const module = await (this.prisma as PrismaClientLike).module.findUnique({
      where: { id },
    });

    if (!module) {
      throw CustomException.notFound(
        ErrorCodes.MODULE.NOT_FOUND,
        `Module with id ${id} not found`
      );
    }

    return module;
  }

  async findByName(name: string) {
    return (this.prisma as PrismaClientLike).module.findUnique({
      where: { name },
    });
  }

  async create(dto: CreateModuleDto, userId?: string) {
    // Check if module name exists
    const existing = await this.findByName(dto.name);

    if (existing) {
      throw CustomException.conflict(
        ErrorCodes.MODULE.NAME_EXISTS,
        `Module with name ${dto.name} already exists`
      );
    }

    // Wrap module creation and permission generation in transaction for atomicity
    const module = await (this.prisma as PrismaClientLike).$transaction(
      async (tx) => {
        const createdModule = await (tx as PrismaClientLike).module.create({
          data: {
            name: dto.name,
            displayName: dto.displayName,
            description: dto.description,
          },
        });

        // Auto-generate permissions for the module within transaction
        await this.autoGeneratePermissionsInTransaction(
          dto.name,
          tx as PrismaClientLike
        );

        return createdModule;
      }
    );

    // Audit log (non-blocking, outside transaction)
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "CREATE",
            resourceType: "Module",
            resourceId: module.id,
            details: {
              name: module.name,
              displayName: module.displayName,
              description: module.description,
            } as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return module;
  }

  async update(id: string, dto: UpdateModuleDto, userId?: string) {
    const module = await this.findOne(id);

    // If name is being updated, check for conflicts
    if (dto.name && dto.name !== module.name) {
      const existing = await this.findByName(dto.name);
      if (existing) {
        throw CustomException.conflict(
          ErrorCodes.MODULE.NAME_EXISTS,
          `Module with name ${dto.name} already exists`
        );
      }
    }

    const updated = await (this.prisma as PrismaClientLike).module.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "UPDATE",
            resourceType: "Module",
            resourceId: updated.id,
            details: {
              changes: dto,
              previous: {
                name: module.name,
                displayName: module.displayName,
                description: module.description,
                isActive: module.isActive,
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

  async remove(id: string, userId?: string) {
    const module = await this.findOne(id);

    // Check if module has permissions assigned to roles
    const permissions = await (
      this.prisma as PrismaClientLike
    ).permission.findMany({
      where: {
        name: {
          startsWith: `${module.name}:`,
        },
      },
      include: {
        rolePermissions: {
          take: 1,
        },
      },
    });

    const hasAssignedPermissions = permissions.some(
      (p) => p.rolePermissions.length > 0
    );

    if (hasAssignedPermissions) {
      throw CustomException.conflict(
        ErrorCodes.MODULE.IN_USE,
        `Cannot delete module ${module.name} because it has permissions assigned to roles`
      );
    }

    // Soft delete by setting isActive to false
    const deleted = await (this.prisma as PrismaClientLike).module.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "DELETE",
            resourceType: "Module",
            resourceId: deleted.id,
            details: {
              name: deleted.name,
              displayName: deleted.displayName,
            } as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return deleted;
  }

  async autoGeneratePermissions(moduleName: string): Promise<void> {
    // Use permissionService for non-transactional calls
    const permissions = STANDARD_ACTIONS.map((action) => ({
      name: `${action}:${moduleName}`,
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${moduleName} module`,
    }));

    for (const perm of permissions) {
      try {
        await this.permissionService.create(
          {
            name: perm.name,
            description: perm.description,
          },
          undefined // No userId for auto-generated permissions
        );
      } catch (error) {
        // Permission might already exist, skip
        if (
          error instanceof CustomException &&
          error.errorCode === ErrorCodes.PERMISSION.NAME_EXISTS
        ) {
          console.warn(
            `Permission ${perm.name} already exists, skipping auto-generation`
          );
          continue;
        }
        throw error;
      }
    }
  }

  private async autoGeneratePermissionsInTransaction(
    moduleName: string,
    tx: PrismaClientLike
  ): Promise<void> {
    const permissions = STANDARD_ACTIONS.map((action) => ({
      name: `${action}:${moduleName}`,
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${moduleName} module`,
    }));

    for (const perm of permissions) {
      try {
        // Check if permission already exists
        const existing = await tx.permission.findUnique({
          where: { name: perm.name },
        });

        if (existing) {
          console.warn(
            `Permission ${perm.name} already exists, skipping auto-generation`
          );
          continue;
        }

        // Create permission within transaction
        await tx.permission.create({
          data: {
            name: perm.name,
            description: perm.description,
          },
        });
      } catch (error) {
        // If unique constraint violation, permission already exists
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          console.warn(
            `Permission ${perm.name} already exists, skipping auto-generation`
          );
          continue;
        }
        throw error;
      }
    }
  }
}
