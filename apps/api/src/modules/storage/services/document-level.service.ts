import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { PrismaClientLike } from "@/common/types/prisma.types";

@Injectable()
export class DocumentLevelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(activeOnly = true) {
    const where = activeOnly ? { isActive: true } : {};
    return (this.prisma as PrismaClientLike).documentLevel.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  async findById(id: string) {
    return (this.prisma as PrismaClientLike).documentLevel.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return (this.prisma as PrismaClientLike).documentLevel.findUnique({
      where: { code },
    });
  }
}
