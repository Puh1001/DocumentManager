import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import * as ExcelJS from "exceljs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@Injectable()
export class KpiExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportRecord(recordId: string): Promise<Buffer> {
    const record = await this.prisma.kpiRecord.findUnique({
      where: { id: recordId },
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("KPI");

    const departmentName = record.department?.name ?? "";

    worksheet.mergeCells("A1:N1");
    worksheet.getCell("A1").value = `部门Bộ phận: ${departmentName}`;

    worksheet.mergeCells("A2:G2");
    worksheet.getCell("A2").value = record.title;
    worksheet.mergeCells("H2:N2");
    worksheet.getCell("H2").value = `目标 Mục tiêu: ${record.target}`;

    const monthHeaders = [
      "1月份 Tháng 1",
      "2月份 Tháng 2",
      "3月份 Tháng 3",
      "4月份 Tháng 4",
      "5月份 Tháng 5",
      "6月份 Tháng 6",
      "7月份 Tháng 7",
      "8月份 Tháng 8",
      "9月份 Tháng 9",
      "10月份 Tháng 10",
      "11月份 Tháng 11",
      "12月份 Tháng 12",
      "平均达成率 Trung bình",
    ];

    worksheet.addRow(["项目Mục", ...monthHeaders]);

    const monthKeys = [
      "m1",
      "m2",
      "m3",
      "m4",
      "m5",
      "m6",
      "m7",
      "m8",
      "m9",
      "m10",
      "m11",
      "m12",
    ] as const;

    const targetMetric = record.metrics.find((m) => m.type === "TARGET");
    const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

    // Add TARGET row
    if (targetMetric) {
      const values = (targetMetric.values ?? {}) as Record<
        string,
        number | null
      >;
      const monthValues = monthKeys.map((key) => values[key] ?? null);
      const avg = this.calculateAverage(values);
      worksheet.addRow([targetMetric.name || "TARGET", ...monthValues, avg]);
    }

    // Add ACTUAL row
    if (actualMetric) {
      const values = (actualMetric.values ?? {}) as Record<
        string,
        number | null
      >;
      const monthValues = monthKeys.map((key) => values[key] ?? null);
      const avg = this.calculateAverage(values);
      worksheet.addRow([actualMetric.name || "ACTUAL", ...monthValues, avg]);
    }

    // Calculate efficiency values once
    const efficiencyValues: (number | null)[] = [];
    if (targetMetric && actualMetric) {
      for (const key of monthKeys) {
        const target =
          (targetMetric.values as Record<string, number | null>)?.[key] ?? null;
        const actual =
          (actualMetric.values as Record<string, number | null>)?.[key] ?? null;
        if (!target || target === 0 || actual == null) {
          efficiencyValues.push(null);
        } else {
          efficiencyValues.push((actual / target) * 100);
        }
      }

      const validEfficiency = efficiencyValues.filter(
        (v): v is number => v != null
      );
      const efficiencyAvg =
        validEfficiency.length > 0
          ? validEfficiency.reduce((acc, v) => acc + v, 0) /
            validEfficiency.length
          : null;

      // Add Efficiency row
      const efficiencyRow = worksheet.addRow([
        "Hiệu suất / Efficiency (%)",
        ...efficiencyValues.map((v) => (v == null ? null : `${v.toFixed(0)}%`)),
        efficiencyAvg != null ? `${efficiencyAvg.toFixed(0)}%` : null,
      ]);

      // Style efficiency row
      efficiencyRow.font = { bold: true };
      efficiencyRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    }

    worksheet.columns.forEach((column) => {
      // eslint-disable-next-line no-param-reassign
      column.width = 14;
    });

    // Apply borders and formatting
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (rowNumber >= 3 && colNumber > 1) {
          cell.alignment = { horizontal: "center" };
        }
      });
    });

    // Style header row
    const headerRow = worksheet.getRow(3);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE3F2FD" },
    };

    // Add chart image if we have efficiency data
    const hasData = efficiencyValues.some((v) => v != null);
    if (hasData) {
      try {
        const chartImage = await this.generateChartImage(
          efficiencyValues,
          record
        );
        if (chartImage) {
          // Add chart image below the table (starting from row after efficiency row)
          // Convert to proper Buffer type for ExcelJS
          const imageBuffer = Buffer.isBuffer(chartImage)
            ? chartImage
            : Buffer.from(chartImage as ArrayBuffer);
          const imageId = workbook.addImage({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            buffer: imageBuffer as any,
            extension: "png",
          });

          worksheet.addImage(imageId, {
            tl: { col: 0, row: worksheet.rowCount + 1 },
            ext: { width: 800, height: 400 },
          });
        }
      } catch (error) {
        console.error("Failed to generate chart image:", error);
        // Continue without chart if image generation fails
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer)
      ? buffer
      : Buffer.from(buffer as ArrayBuffer);
  }

  private async generateChartImage(
    efficiencyValues: (number | null)[],
    record: { targetValue?: number | null }
  ): Promise<Buffer | null> {
    const validValues = efficiencyValues.filter((v): v is number => v != null);
    if (validValues.length === 0) return null;

    const maxValue = Math.max(...validValues);

    const monthLabels = [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ];

    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: "white",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasets: any[] = [
      {
        type: "bar" as const,
        label: "Hiệu suất (%)",
        data: efficiencyValues.map((v) => (v == null ? 0 : v)),
        backgroundColor: efficiencyValues.map((v) => {
          if (v == null) return "rgba(200,200,200,0.5)";
          if (record.targetValue && v >= record.targetValue) {
            return "rgba(255, 205, 86, 0.8)";
          }
          if (v >= 100) return "rgba(54, 162, 235, 0.8)";
          return "rgba(146, 208, 80, 0.8)";
        }),
      },
    ];

    // Add target line if targetValue exists
    if (record.targetValue != null) {
      datasets.push({
        type: "line" as const,
        label: "Mục tiêu / Target",
        data: Array(monthLabels.length).fill(record.targetValue),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0,
      });
    }

    // Calculate max with target consideration and smart scaling
    const minValue = Math.min(...validValues);
    const dataRange = maxValue - minValue;
    
    const maxWithTarget = record.targetValue
      ? Math.max(maxValue, record.targetValue)
      : maxValue;

    // Smart padding based on value range
    let paddingPercent = 0.2; // Default 20% padding

    if (maxWithTarget < 10) {
      // For very low values (< 10%), use larger padding (50%)
      paddingPercent = 0.5;
    } else if (maxWithTarget < 50) {
      // For low values (10-50%), use medium padding (30%)
      paddingPercent = 0.3;
    }

    // Calculate dynamic max with smart padding
    let adjustedMax = maxWithTarget * (1 + paddingPercent);

    // Ensure minimum visible range for very small values
    if (maxWithTarget < 5 && dataRange < 2) {
      adjustedMax = Math.max(adjustedMax, 5);
    } else if (maxWithTarget < 10) {
      adjustedMax = Math.max(adjustedMax, 10);
    } else if (maxWithTarget < 100) {
      adjustedMax = Math.max(adjustedMax, maxWithTarget * 1.2);
    } else {
      adjustedMax = maxWithTarget * 1.2;
    }

    // Round up to nearest nice number
    let niceMax: number;
    if (adjustedMax < 10) {
      niceMax = Math.ceil(adjustedMax / 1) * 1; // Round to nearest 1
    } else if (adjustedMax < 50) {
      niceMax = Math.ceil(adjustedMax / 5) * 5; // Round to nearest 5
    } else {
      niceMax = Math.ceil(adjustedMax / 10) * 10; // Round to nearest 10
    }

    const configuration = {
      type: "bar" as const,
      data: {
        labels: monthLabels,
        datasets,
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: "KPI / Hiệu suất (%)",
            font: { size: 16 },
          },
          legend: {
            display: true,
            position: "top" as const,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: niceMax,
            ticks: {
              callback: (value: number | string) => `${value}%`,
            },
          },
        },
      },
    };

    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return imageBuffer as Buffer;
  }

  private calculateAverage(
    values: Record<string, number | null>
  ): number | null {
    const nums = Object.values(values).filter(
      (v): v is number => typeof v === "number"
    );
    if (!nums.length) {
      return null;
    }
    const sum = nums.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / nums.length) * 100) / 100;
  }
}
