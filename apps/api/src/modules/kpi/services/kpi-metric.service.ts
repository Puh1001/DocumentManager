import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateKpiMetricDto } from "../dto/create-kpi-metric.dto";
import { UpdateKpiMetricDto } from "../dto/update-kpi-metric.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@Injectable()
export class KpiMetricService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateKpiMetricDto) {
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

  async update(id: string, dto: UpdateKpiMetricDto) {
    await this.ensureExists(id);

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

  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.kpiMetric.delete({
      where: { id },
    });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.kpiMetric.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw CustomException.notFound(
        ErrorCodes.KPI.METRIC_NOT_FOUND,
        "KPI metric not found"
      );
    }
  }
}
