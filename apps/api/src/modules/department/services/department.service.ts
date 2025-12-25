import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { UpdateDepartmentDto } from "../dto/update-department.dto";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    try {
      return this.prisma.department.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    } catch (error) {
      // Log error for debugging
      console.error("Error in DepartmentService.findAll():", error);

      // Re-throw as CustomException for proper error handling
      throw CustomException.internalServerError(
        ErrorCodes.DEPARTMENT.FETCH_FAILED,
        "Failed to fetch departments",
        error
      );
    }
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw CustomException.notFound(
        ErrorCodes.DEPARTMENT.NOT_FOUND,
        "Department not found"
      );
    }

    return department;
  }

  async create(dto: CreateDepartmentDto) {
    // Check if code already exists
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw CustomException.conflict(
        ErrorCodes.DEPARTMENT.CODE_EXISTS,
        "Department code already exists"
      );
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw CustomException.notFound(
        ErrorCodes.DEPARTMENT.NOT_FOUND,
        "Department not found"
      );
    }

    // Check if code is being changed and if it conflicts
    if (dto.code && dto.code !== department.code) {
      const existing = await this.prisma.department.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw CustomException.conflict(
          ErrorCodes.DEPARTMENT.CODE_EXISTS,
          "Department code already exists"
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw CustomException.notFound(
        ErrorCodes.DEPARTMENT.NOT_FOUND,
        "Department not found"
      );
    }

    // Soft delete by setting isActive to false
    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
