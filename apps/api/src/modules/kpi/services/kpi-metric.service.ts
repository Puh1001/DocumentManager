import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateKpiMetricDto } from "../dto/create-kpi-metric.dto";
import { UpdateKpiMetricDto } from "../dto/update-kpi-metric.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import {
  UserWithDepartments,
  UserDepartmentResolver,
} from "./user-department.resolver";

@Injectable()
export class KpiMetricService {
  private readonly logger = new Logger(KpiMetricService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userDepartmentResolver: UserDepartmentResolver
  ) {}

  async create(dto: CreateKpiMetricDto, user: UserWithDepartments) {
    // Check parent record's department access
    await this.checkParentRecordAccess(dto.kpiRecordId, user);

    return this.prisma.kpiMetric.create({
      data: {
        kpiRecordId: dto.kpiRecordId,
        name: dto.name,
        type: dto.type,
        sortOrder: dto.sortOrder,
        values: dto.values ? JSON.parse(dto.values) : {},
      },
    });
  }

  async update(id: string, dto: UpdateKpiMetricDto, user: UserWithDepartments) {
    const metric = await this.prisma.kpiMetric.findUnique({
      where: { id },
      select: { kpiRecordId: true },
    });

    if (!metric) {
      throw CustomException.notFound(
        ErrorCodes.KPI.METRIC_NOT_FOUND,
        "KPI metric not found"
      );
    }

    // Check parent record's department access
    await this.checkParentRecordAccess(metric.kpiRecordId, user);

    return this.prisma.kpiMetric.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        sortOrder: dto.sortOrder,
        values: dto.values ? JSON.parse(dto.values) : undefined,
      },
    });
  }

  async remove(id: string, user: UserWithDepartments) {
    const metric = await this.prisma.kpiMetric.findUnique({
      where: { id },
      select: { kpiRecordId: true },
    });

    if (!metric) {
      throw CustomException.notFound(
        ErrorCodes.KPI.METRIC_NOT_FOUND,
        "KPI metric not found"
      );
    }

    // Check parent record's department access
    await this.checkParentRecordAccess(metric.kpiRecordId, user);

    return this.prisma.kpiMetric.delete({
      where: { id },
    });
  }

  /**
   * Check if user has access to the parent KPI record's department.
   * Throws 403 Forbidden if access is denied.
   */
  private async checkParentRecordAccess(
    kpiRecordId: string,
    user: UserWithDepartments
  ): Promise<void> {
    const record = await this.prisma.kpiRecord.findUnique({
      where: { id: kpiRecordId },
      select: { departmentId: true },
    });

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    // Admin/Boss: Full access
    if (user.isAdmin || user.isBoss) {
      return;
    }

    // Regular users: Must be assigned to the department
    if (!user.departmentIds || user.departmentIds.length === 0) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI metric without departments`,
        {
          userId: user.userId,
          kpiRecordId,
          recordDepartmentId: record.departmentId,
        }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
        "User must belong to a department to access KPI metrics"
      );
    }

    if (!user.departmentIds.includes(record.departmentId)) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI metric from non-assigned department`,
        {
          userId: user.userId,
          userDepartmentIds: user.departmentIds,
          kpiRecordId,
          recordDepartmentId: record.departmentId,
        }
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        "Access denied: KPI metric belongs to a department you're not assigned to"
      );
    }
  }
}
