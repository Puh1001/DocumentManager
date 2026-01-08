import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateKpiRecordDto } from "../dto/create-kpi-record.dto";
import { UpdateKpiRecordDto } from "../dto/update-kpi-record.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import {
  UserWithDepartments,
  UserDepartmentResolver,
} from "./user-department.resolver";

interface FindAllParams {
  departmentId?: string;
  year?: number;
}

@Injectable()
export class KpiRecordService {
  private readonly logger = new Logger(KpiRecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userDepartmentResolver: UserDepartmentResolver
  ) {}

  async findAll(params: FindAllParams, user: UserWithDepartments) {
    const { departmentId, year } = params;

    // Admin/Boss: No restrictions
    if (user.isAdmin || user.isBoss) {
      return this.prisma.kpiRecord.findMany({
        where: {
          departmentId: departmentId || undefined,
          year: year || undefined,
        },
        include: {
          department: true,
          metrics: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Regular users: Only their departments
    if (!user.departmentIds || user.departmentIds.length === 0) {
      // User has no departments, return empty array
      return [];
    }

    // Filter by user's departments (or specific department if provided and user has access)
    const deptFilter = departmentId
      ? user.departmentIds.includes(departmentId)
        ? departmentId
        : undefined
      : { in: user.departmentIds };

    return this.prisma.kpiRecord.findMany({
      where: {
        departmentId: deptFilter,
        year: year || undefined,
      },
      include: {
        department: true,
        metrics: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, user: UserWithDepartments) {
    const record = await this.prisma.kpiRecord.findUnique({
      where: { id },
      include: {
        department: true,
        metrics: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    // Check department access
    this.checkDepartmentAccess(record.departmentId, user);

    return record;
  }

  async create(dto: CreateKpiRecordDto, user: UserWithDepartments) {
    // Validate departmentId matches user's departments (unless admin/boss)
    if (!user.isAdmin && !user.isBoss) {
      if (!user.departmentIds || user.departmentIds.length === 0) {
        this.logger.warn(
          `Authorization denied: User ${user.userId} attempted to create KPI record without departments`,
          { userId: user.userId, departmentId: dto.departmentId }
        );
        throw CustomException.forbidden(
          ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
          "User must belong to a department to create KPI records"
        );
      }
      if (!user.departmentIds.includes(dto.departmentId)) {
        this.logger.warn(
          `Authorization denied: User ${user.userId} attempted to create KPI record for non-assigned department`,
          {
            userId: user.userId,
            userDepartmentIds: user.departmentIds,
            requestedDepartmentId: dto.departmentId,
          }
        );
        throw CustomException.forbidden(
          ErrorCodes.KPI.DEPARTMENT_MISMATCH,
          "Cannot create KPI record for a department you're not assigned to"
        );
      }
    }

    return this.prisma.kpiRecord.create({
      data: {
        departmentId: dto.departmentId,
        year: dto.year,
        title: dto.title,
        target: dto.target,
        targetValue: dto.targetValue,
        displayType: dto.displayType,
        rowMode: dto.rowMode,
      },
    });
  }

  async update(id: string, dto: UpdateKpiRecordDto, user: UserWithDepartments) {
    // Check existing record's department
    const existing = await this.prisma.kpiRecord.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!existing) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    // Check department access
    this.checkDepartmentAccess(existing.departmentId, user);

    // If updating departmentId, validate new department (unless admin/boss)
    if (dto.departmentId && dto.departmentId !== existing.departmentId) {
      if (!user.isAdmin && !user.isBoss) {
        if (
          !user.departmentIds ||
          !user.departmentIds.includes(dto.departmentId)
        ) {
          throw CustomException.forbidden(
            ErrorCodes.KPI.DEPARTMENT_MISMATCH,
            "Cannot move KPI record to a department you're not assigned to"
          );
        }
      }
    }

    return this.prisma.kpiRecord.update({
      where: { id },
      data: {
        departmentId: dto.departmentId,
        year: dto.year,
        title: dto.title,
        target: dto.target,
        targetValue: dto.targetValue,
        displayType: dto.displayType,
        rowMode: dto.rowMode,
      },
    });
  }

  async remove(id: string, user: UserWithDepartments) {
    const record = await this.prisma.kpiRecord.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    // Check department access
    this.checkDepartmentAccess(record.departmentId, user);

    return this.prisma.kpiRecord.delete({
      where: { id },
    });
  }

  /**
   * Check if user has access to a department's KPI records.
   * Throws 403 Forbidden if access is denied.
   */
  private checkDepartmentAccess(
    recordDepartmentId: string,
    user: UserWithDepartments
  ): void {
    // Admin/Boss: Full access
    if (user.isAdmin || user.isBoss) {
      return;
    }

    // Regular users: Must be assigned to the department
    if (!user.departmentIds || user.departmentIds.length === 0) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI record without departments`,
        { userId: user.userId, recordDepartmentId }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
        "User must belong to a department to access KPI records"
      );
    }

    if (!user.departmentIds.includes(recordDepartmentId)) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI record from non-assigned department`,
        {
          userId: user.userId,
          userDepartmentIds: user.departmentIds,
          recordDepartmentId,
        }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        "Access denied: KPI record belongs to a department you're not assigned to"
      );
    }
  }
}
