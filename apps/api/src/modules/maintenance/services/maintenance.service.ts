import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateMaintenanceNoticeDto } from "../dto/create-maintenance-notice.dto";
import { UpdateMaintenanceNoticeDto } from "../dto/update-maintenance-notice.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return this.prisma.maintenanceNotice.findMany({
        orderBy: { startDate: "asc" },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });
    } catch (error) {
      // Log error for debugging
      console.error("Error in MaintenanceService.findAll():", error);

      // Re-throw as CustomException for proper error handling
      throw CustomException.internalServerError(
        ErrorCodes.MAINTENANCE.FETCH_FAILED,
        "Failed to fetch maintenance notices",
        error
      );
    }
  }

  async findOne(id: string) {
    const notice = await this.prisma.maintenanceNotice.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!notice) {
      throw CustomException.notFound(
        ErrorCodes.MAINTENANCE.NOT_FOUND,
        "Maintenance notice not found"
      );
    }

    return notice;
  }

  private async resolveUserInfo(userId: string): Promise<{
    departmentIds: string[];
    isAdmin: boolean;
    isBoss: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        departments: { select: { departmentId: true } },
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) throw CustomException.notFound(ErrorCodes.USER.NOT_FOUND, "User not found");
    const roleNames = user.roles.map((r) => r.role.name);
    return {
      departmentIds: user.departments.map((d) => d.departmentId),
      isAdmin: roleNames.includes("admin"),
      isBoss: roleNames.includes("boss"),
    };
  }

  async create(dto: CreateMaintenanceNoticeDto, userId: string) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw CustomException.badRequest(
        ErrorCodes.INVALID_INPUT,
        "End date must be after or equal to start date"
      );
    }

    // Validate department exists if provided
    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });

      if (!department) {
        throw CustomException.notFound(
          ErrorCodes.DEPARTMENT.NOT_FOUND,
          "Department not found"
        );
      }

      // Non-admin/boss users can only create notices for their own departments
      const userInfo = await this.resolveUserInfo(userId);
      if (!userInfo.isAdmin && !userInfo.isBoss) {
        if (
          !userInfo.departmentIds ||
          !userInfo.departmentIds.includes(dto.departmentId)
        ) {
          throw CustomException.forbidden(
            ErrorCodes.PERMISSION.INVALID_SUBJECT,
            "You can only create maintenance notices for your own department"
          );
        }
      }
    }

    return this.prisma.maintenanceNotice.create({
      data: {
        title: dto.title,
        description: dto.description,
        startDate,
        endDate,
        departmentId: dto.departmentId,
        createdBy: userId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateMaintenanceNoticeDto, userId?: string) {
    const notice = await this.prisma.maintenanceNotice.findUnique({
      where: { id },
    });

    if (!notice) {
      throw CustomException.notFound(
        ErrorCodes.MAINTENANCE.NOT_FOUND,
        "Maintenance notice not found"
      );
    }

    // Non-admin/boss can only update own department notices
    if (userId) {
      const userInfo = await this.resolveUserInfo(userId);
      if (!userInfo.isAdmin && !userInfo.isBoss) {
        if (
          !userInfo.departmentIds ||
          !notice.departmentId ||
          !userInfo.departmentIds.includes(notice.departmentId)
        ) {
          throw CustomException.forbidden(
            ErrorCodes.PERMISSION.INVALID_SUBJECT,
            "You can only update maintenance notices from your own department"
          );
        }
      }
    }

    // Validate dates if provided
    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : notice.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : notice.endDate;

    if (endDate < startDate) {
      throw CustomException.badRequest(
        ErrorCodes.INVALID_INPUT,
        "End date must be after or equal to start date"
      );
    }

    // Validate department exists if provided
    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });

      if (!department) {
        throw CustomException.notFound(
          ErrorCodes.DEPARTMENT.NOT_FOUND,
          "Department not found"
        );
      }
    }

    return this.prisma.maintenanceNotice.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate && { startDate }),
        ...(dto.endDate && { endDate }),
        ...(dto.departmentId !== undefined && {
          departmentId: dto.departmentId,
        }),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId?: string) {
    const notice = await this.prisma.maintenanceNotice.findUnique({
      where: { id },
    });

    if (!notice) {
      throw CustomException.notFound(
        ErrorCodes.MAINTENANCE.NOT_FOUND,
        "Maintenance notice not found"
      );
    }

    // Non-admin/boss can only delete own department notices
    if (userId) {
      const userInfo = await this.resolveUserInfo(userId);
      if (!userInfo.isAdmin && !userInfo.isBoss) {
        if (
          !userInfo.departmentIds ||
          !notice.departmentId ||
          !userInfo.departmentIds.includes(notice.departmentId)
        ) {
          throw CustomException.forbidden(
            ErrorCodes.PERMISSION.INVALID_SUBJECT,
            "You can only delete maintenance notices from your own department"
          );
        }
      }
    }

    return this.prisma.maintenanceNotice.delete({
      where: { id },
    });
  }
}
