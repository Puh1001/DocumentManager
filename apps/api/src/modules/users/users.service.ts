import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService, Prisma } from "@/common/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { PrismaClientLike } from "@/common/types/prisma.types";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Check if username or email exists
    const existing = await (this.prisma as PrismaClientLike).user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existing) {
      throw new ConflictException("Username or email already exists");
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await (this.prisma as PrismaClientLike).user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        department: dto.department,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 20, search, department, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      (this.prisma as PrismaClientLike).user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          department: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          roles: {
            include: { role: true },
          },
        },
      }),
      (this.prisma as PrismaClientLike).user.count({ where }),
    ]);

    return {
      data: users.map((u: (typeof users)[0]) => ({
        ...u,
        roles: u.roles.map((r: (typeof u.roles)[0]) => r.role),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const user = await (this.prisma as PrismaClientLike).user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        department: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...user,
      roles: user.roles.map((r: (typeof user.roles)[0]) => r.role),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await (this.prisma as PrismaClientLike).user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.email) data.email = dto.email;
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await argon2.hash(dto.password);

    return (this.prisma as PrismaClientLike).user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        department: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  async assignRole(userId: string, roleId: string) {
    return (this.prisma as PrismaClientLike).userRole.create({
      data: { userId, roleId },
      include: { role: true },
    });
  }

  async removeRole(userId: string, roleId: string) {
    return (this.prisma as PrismaClientLike).userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async count(): Promise<number> {
    return (this.prisma as PrismaClientLike).user.count({
      where: { isActive: true },
    });
  }
}
