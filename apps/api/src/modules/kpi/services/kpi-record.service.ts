import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateKpiRecordDto } from "../dto/create-kpi-record.dto";
import { UpdateKpiRecordDto } from "../dto/update-kpi-record.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

interface FindAllParams {
  departmentId?: string;
  year?: number;
}

@Injectable()
export class KpiRecordService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: FindAllParams) {
    const { departmentId, year } = params;

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

  async findOne(id: string) {
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

    return record;
  }

  create(dto: CreateKpiRecordDto) {
    return this.prisma.kpiRecord.create({
      data: {
        departmentId: dto.departmentId,
        year: dto.year,
        title: dto.title,
        target: dto.target,
        targetValue: dto.targetValue,
      },
    });
  }

  async update(id: string, dto: UpdateKpiRecordDto) {
    await this.ensureExists(id);

    return this.prisma.kpiRecord.update({
      where: { id },
      data: {
        departmentId: dto.departmentId,
        year: dto.year,
        title: dto.title,
        target: dto.target,
        targetValue: dto.targetValue,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.kpiRecord.delete({
      where: { id },
    });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.kpiRecord.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }
  }
}
