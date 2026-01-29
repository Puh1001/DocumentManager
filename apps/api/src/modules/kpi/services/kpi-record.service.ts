import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateKpiRecordDto } from "../dto/create-kpi-record.dto";
import { UpdateKpiRecordDto } from "../dto/update-kpi-record.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";
import { KpiStatus } from "@prisma/client";
import {
  UserWithDepartments,
  UserDepartmentResolver,
} from "./user-department.resolver";

// Departments not in KPI scope (exact match on Department.code)
// These departments may exist for user/doc assignment but must not have KPI records.
const KPI_EXCLUDED_DEPARTMENT_CODES = new Set([
  "AC",
  "IT",
  "DCC",
  "LTB(E)",
  "CN_HUNG_YEN_DET_DAI",
  "CN_HUNG_YEN_DET_NGANG",
  "CN_NGHE_AN_2_DET_NGANG",
  "DET_NGANG_S",
  "PD",
  "QC",
]);

interface FindAllParams {
  departmentId?: string;
  year?: number;
}

@Injectable()
export class KpiRecordService {
  private readonly logger = new Logger(KpiRecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userDepartmentResolver: UserDepartmentResolver,
  ) {}

  async findAll(params: FindAllParams, user: UserWithDepartments) {
    const { departmentId, year } = params;

    // Admin/Boss/KpiViewerAll: No restrictions (read-only for kpi_viewer_all)
    if (user.isAdmin || user.isBoss || user.isKpiViewerAll) {
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
        "KPI record not found",
      );
    }

    // Check department access
    this.checkDepartmentAccess(record.departmentId, user);

    return record;
  }

  async create(dto: CreateKpiRecordDto, user: UserWithDepartments) {
    // kpi_viewer_all role is read-only, cannot create
    if (user.isKpiViewerAll) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} with kpi_viewer_all role attempted to create KPI record`,
        { userId: user.userId, departmentId: dto.departmentId },
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "kpi_viewer_all role is read-only. Cannot create KPI records.",
      );
    }

    // Enforce KPI scope (prevents accidental records for AC/IT/DCC/...)
    await this.assertDepartmentInKpiScope(dto.departmentId);

    // Validate departmentId matches user's departments (unless admin/boss)
    if (!user.isAdmin && !user.isBoss) {
      if (!user.departmentIds || user.departmentIds.length === 0) {
        this.logger.warn(
          `Authorization denied: User ${user.userId} attempted to create KPI record without departments`,
          { userId: user.userId, departmentId: dto.departmentId },
        );
        throw CustomException.forbidden(
          ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
          "User must belong to a department to create KPI records",
        );
      }
      if (!user.departmentIds.includes(dto.departmentId)) {
        this.logger.warn(
          `Authorization denied: User ${user.userId} attempted to create KPI record for non-assigned department`,
          {
            userId: user.userId,
            userDepartmentIds: user.departmentIds,
            requestedDepartmentId: dto.departmentId,
          },
        );
        throw CustomException.forbidden(
          ErrorCodes.KPI.DEPARTMENT_MISMATCH,
          "Cannot create KPI record for a department you're not assigned to",
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
        status: dto.status,
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
        "KPI record not found",
      );
    }

    // Check department access
    this.checkDepartmentAccess(existing.departmentId, user);

    // kpi_viewer_all role is read-only, cannot update
    if (user.isKpiViewerAll) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} with kpi_viewer_all role attempted to update KPI record`,
        { userId: user.userId, recordId: id },
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "kpi_viewer_all role is read-only. Cannot update KPI records.",
      );
    }

    // If updating departmentId, validate new department (unless admin/boss)
    if (dto.departmentId && dto.departmentId !== existing.departmentId) {
      // Enforce KPI scope for destination department
      await this.assertDepartmentInKpiScope(dto.departmentId);

      if (!user.isAdmin && !user.isBoss) {
        if (
          !user.departmentIds ||
          !user.departmentIds.includes(dto.departmentId)
        ) {
          throw CustomException.forbidden(
            ErrorCodes.KPI.DEPARTMENT_MISMATCH,
            "Cannot move KPI record to a department you're not assigned to",
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
        status: dto.status,
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
        "KPI record not found",
      );
    }

    // kpi_viewer_all role is read-only, cannot delete
    if (user.isKpiViewerAll) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} with kpi_viewer_all role attempted to delete KPI record`,
        { userId: user.userId, recordId: id },
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "kpi_viewer_all role is read-only. Cannot delete KPI records.",
      );
    }

    // Check department access
    this.checkDepartmentAccess(record.departmentId, user);

    return this.prisma.kpiRecord.delete({
      where: { id },
    });
  }

  /**
   * Update KPI record status manually.
   * Validates department access and user permissions.
   */
  async updateStatus(id: string, status: KpiStatus, user: UserWithDepartments) {
    // Check existing record
    const existing = await this.prisma.kpiRecord.findUnique({
      where: { id },
      select: {
        id: true,
        departmentId: true,
        status: true,
      },
    });

    if (!existing) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found",
      );
    }

    // Check department access
    this.checkDepartmentAccess(existing.departmentId, user);

    // kpi_viewer_all role is read-only
    if (user.isKpiViewerAll) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} with kpi_viewer_all role attempted to update KPI status`,
        { userId: user.userId, recordId: id },
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "kpi_viewer_all role is read-only. Cannot update KPI status.",
      );
    }

    // Validate status transition
    this.validateStatusTransition(existing.status, status);

    // Update status
    const updated = await this.prisma.kpiRecord.update({
      where: { id },
      data: { status },
      include: {
        department: true,
        metrics: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "UPDATE",
        resourceType: "KpiRecord",
        resourceId: id,
        details: {
          field: "status",
          oldValue: existing.status,
          newValue: status,
        },
      },
    });

    this.logger.log(
      `KPI record ${id} status updated: ${existing.status} → ${status} by user ${user.userId}`,
    );

    return updated;
  }

  /**
   * Validate if status transition is allowed
   * @throws CustomException if transition is invalid
   */
  private validateStatusTransition(
    currentStatus: KpiStatus,
    newStatus: KpiStatus,
  ): void {
    // Same status is always allowed (no-op)
    if (currentStatus === newStatus) {
      return;
    }

    // Define valid state transitions
    const allowedTransitions: Record<KpiStatus, KpiStatus[]> = {
      [KpiStatus.PENDING]: [KpiStatus.IN_PROGRESS, KpiStatus.COMPLETED],
      [KpiStatus.IN_PROGRESS]: [KpiStatus.COMPLETED, KpiStatus.PENDING],
      [KpiStatus.COMPLETED]: [KpiStatus.IN_PROGRESS, KpiStatus.PENDING],
    };

    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      this.logger.warn(
        `Invalid status transition attempted: ${currentStatus} → ${newStatus}`,
      );
      throw CustomException.badRequest(
        ErrorCodes.INVALID_INPUT,
        `Invalid status transition: ${currentStatus} → ${newStatus}`,
      );
    }
  }

  /**
   * Check if user has access to a department's KPI records.
   * Throws 403 Forbidden if access is denied.
   */
  private checkDepartmentAccess(
    recordDepartmentId: string,
    user: UserWithDepartments,
  ): void {
    // Admin/Boss/KpiViewerAll: Full access (read-only for kpi_viewer_all)
    if (user.isAdmin || user.isBoss || user.isKpiViewerAll) {
      return;
    }

    // Regular users: Must be assigned to the department
    if (!user.departmentIds || user.departmentIds.length === 0) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI record without departments`,
        { userId: user.userId, recordDepartmentId },
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_NO_DEPARTMENT,
        "User must belong to a department to access KPI records",
      );
    }

    if (!user.departmentIds.includes(recordDepartmentId)) {
      this.logger.warn(
        `Authorization denied: User ${user.userId} attempted to access KPI record from non-assigned department`,
        {
          userId: user.userId,
          userDepartmentIds: user.departmentIds,
          recordDepartmentId,
        },
      );
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED_DIFFERENT_DEPARTMENT,
        "Access denied: KPI record belongs to a department you're not assigned to",
      );
    }
  }

  private async assertDepartmentInKpiScope(
    departmentId: string,
  ): Promise<void> {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { code: true },
    });

    if (!dept) {
      throw CustomException.notFound(
        ErrorCodes.NOT_FOUND,
        "Department not found",
      );
    }

    if (KPI_EXCLUDED_DEPARTMENT_CODES.has(dept.code)) {
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        `Department ${dept.code} is not in KPI scope`,
      );
    }
  }
}
