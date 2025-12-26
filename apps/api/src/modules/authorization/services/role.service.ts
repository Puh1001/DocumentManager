import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { QueryRolesDto } from "../dto/query-roles.dto";

const SYSTEM_ROLES = ["admin", "boss", "manager", "editor", "viewer"];

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto, userId?: string) {
    // Check if role name exists
    const existing = await (this.prisma as PrismaClientLike).role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw CustomException.conflict(
        ErrorCodes.ROLE.NAME_EXISTS,
        `Role with name ${dto.name} already exists`
      );
    }

    const role = await (this.prisma as PrismaClientLike).role.create({
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
            resourceType: "Role",
            resourceId: role.id,
            details: {
              name: role.name,
              description: role.description,
            },
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return role;
  }

  async findAll(query: QueryRolesDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RoleWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [roles, total] = await Promise.all([
      (this.prisma as PrismaClientLike).role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              users: true,
              permissions: true,
            },
          },
        },
      }),
      (this.prisma as PrismaClientLike).role.count({ where }),
    ]);

    return {
      data: roles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const role = await (this.prisma as PrismaClientLike).role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    if (!role) {
      throw CustomException.notFound(
        ErrorCodes.ROLE.NOT_FOUND,
        `Role with ID ${id} not found`
      );
    }

    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async update(id: string, dto: UpdateRoleDto, userId?: string) {
    const role = await (this.prisma as PrismaClientLike).role.findUnique({
      where: { id },
    });

    if (!role) {
      throw CustomException.notFound(
        ErrorCodes.ROLE.NOT_FOUND,
        `Role with ID ${id} not found`
      );
    }

    // Check if new name conflicts
    if (dto.name && dto.name !== role.name) {
      const existing = await (this.prisma as PrismaClientLike).role.findUnique({
        where: { name: dto.name },
      });

      if (existing) {
        throw CustomException.conflict(
          ErrorCodes.ROLE.NAME_EXISTS,
          `Role with name ${dto.name} already exists`
        );
      }
    }

    const updated = await (this.prisma as PrismaClientLike).role.update({
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
            resourceType: "Role",
            resourceId: id,
            details: {
              changes: dto,
              previous: {
                name: role.name,
                description: role.description,
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
    const role = await (this.prisma as PrismaClientLike).role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    if (!role) {
      throw CustomException.notFound(
        ErrorCodes.ROLE.NOT_FOUND,
        `Role with ID ${id} not found`
      );
    }

    // Prevent deletion of system roles
    if (SYSTEM_ROLES.includes(role.name.toLowerCase())) {
      throw CustomException.badRequest(
        ErrorCodes.ROLE.SYSTEM_ROLE,
        `Cannot delete system role: ${role.name}`
      );
    }

    // Check if role is in use
    if (role._count.users > 0 || role._count.permissions > 0) {
      throw CustomException.badRequest(
        ErrorCodes.ROLE.IN_USE,
        `Cannot delete role: ${role.name} is assigned to ${role._count.users} users and has ${role._count.permissions} permissions`
      );
    }

    await (this.prisma as PrismaClientLike).role.delete({
      where: { id },
    });

    // Audit log
    if (userId) {
      try {
        await (this.prisma as PrismaClientLike).auditLog.create({
          data: {
            userId,
            action: "DELETE",
            resourceType: "Role",
            resourceId: id,
            details: {
              name: role.name,
              description: role.description,
            },
          },
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }

    return { message: "Role deleted successfully" };
  }
}
