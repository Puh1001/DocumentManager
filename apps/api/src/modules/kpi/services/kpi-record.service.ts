import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateKpiRecordDto } from "../dto/create-kpi-record.dto";
import { UpdateKpiRecordDto } from "../dto/update-kpi-record.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import {
  UserWithDepartment,
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

  async findAll(params: FindAllParams, user: UserWithDepartment) {
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

    // Regular users: Only their department
    if (!user.departmentId) {
      // User has no department, return empty array
      return [];
    }

    // Filter by user's department (ignore provided departmentId if different)
    return this.prisma.kpiRecord.findMany({
      where: {
        departmentId: user.departmentId,
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

  async findOne(id: string, user: UserWithDepartment) {
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

  async create(dto: CreateKpiRecordDto, user: UserWithDepartment) {
    // Validate departmentId matches user's department (unless admin/boss)
    if (!user.isAdmin && !user.isBoss) {
      if (!user.departmentId) {
        this.logger.warn(
          `Authorization denied: User ${user.userId} attempted to create KPI record without department`,
          { userId: user.userId, departmentId: dto.departmentId }
        );
        throw CustomException.forbidden(
          ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
          "User must belong to a department to create KPI records"
        );
      }
      if (dto.departmentId !== user.departmentId) {
        this.logger.warn(
          `Authorization denied: User ${user.userId} attempted to create KPI record for different department`,
          {
            userId: user.userId,
            userDepartmentId: user.departmentId,
            requestedDepartmentId: dto.departmentId,
          }
        );
        throw CustomException.forbidden(
          ErrorCodes.KPI.DEPARTMENT_MISMATCH,
          "Cannot create KPI record for a different department"
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

  async update(id: string, dto: UpdateKpiRecordDto, user: UserWithDepartment) {
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
        if (dto.departmentId !== user.departmentId) {
          throw CustomException.forbidden(
            ErrorCodes.KPI.DEPARTMENT_MISMATCH,
            "Cannot move KPI record to a different department"
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

  async remove(id: string, user: UserWithDepartment) {
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
    user: UserWithDepartment
  ): void {
    // Admin/Boss: Full access
    if (user.isAdmin || user.isBoss) {
      return;
    }

    // Regular users: Must match their department
    if (!user.departmentId) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI record without department`,
        { userId: user.userId, recordDepartmentId }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
        "User must belong to a department to access KPI records"
      );
    }

    if (recordDepartmentId !== user.departmentId) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI record from different department`,
        {
          userId: user.userId,
          userDepartmentId: user.departmentId,
          recordDepartmentId,
        }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        "Access denied: KPI record belongs to a different department"
      );
    }
  }
}
