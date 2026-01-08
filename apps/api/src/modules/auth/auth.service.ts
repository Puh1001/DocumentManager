import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "@/common/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import {
  PrismaClientLike,
  UserWithRolesAndDepartments,
} from "@/common/types/prisma.types";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async validateUser(username: string, password: string) {
    const user = await (this.prisma as PrismaClientLike).user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        roles: {
          include: { role: true },
        },
        departments: {
          // NEW: Include departments for multi-department support
          include: {
            department: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw CustomException.unauthorized(
        ErrorCodes.AUTH.LOGIN_INVALID_CREDENTIALS,
        "Invalid credentials"
      );
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw CustomException.unauthorized(
        ErrorCodes.AUTH.LOGIN_INVALID_CREDENTIALS,
        "Invalid credentials"
      );
    }

    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await (this.prisma as PrismaClientLike).user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw CustomException.unauthorized(
        ErrorCodes.AUTH.USER_NOT_FOUND,
        "User not found or inactive"
      );
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      currentPassword
    );

    if (!isPasswordValid) {
      throw CustomException.unauthorized(
        ErrorCodes.AUTH.CHANGE_PASSWORD_INVALID_CURRENT,
        "Current password is incorrect"
      );
    }

    const newPasswordHash = await argon2.hash(newPassword);

    await (this.prisma as PrismaClientLike).user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    await (this.prisma as PrismaClientLike).auditLog.create({
      data: {
        userId: user.id,
        action: "CHANGE_PASSWORD",
      },
    });

    return { message: "Password changed successfully" };
  }

  async login(
    user: UserWithRolesAndDepartments,
    ipAddress?: string,
    userAgent?: string
  ) {
    const payload = {
      sub: user.id,
      username: user.username,
      roles: user.roles?.map((ur) => ur.role.name) || [],
    };

    const accessToken = this.jwtService.sign(payload);
    let refreshToken = this.generateRefreshToken(payload);

    // Save session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      await (this.prisma as PrismaClientLike).session.create({
        data: {
          userId: user.id,
          refreshToken,
          ipAddress,
          userAgent,
          expiresAt,
        },
      });
    } catch (error) {
      if (this.isRefreshTokenUniqueError(error)) {
        refreshToken = this.generateRefreshToken(payload);
        await (this.prisma as PrismaClientLike).session.create({
          data: {
            userId: user.id,
            refreshToken,
            ipAddress,
            userAgent,
            expiresAt,
          },
        });
      } else {
        throw error;
      }
    }

    // Update last login
    await (this.prisma as PrismaClientLike).user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await (this.prisma as PrismaClientLike).auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        ipAddress,
        userAgent,
      },
    });

    // Get user's departments
    const userDepartments = user.departments?.map((ud) => ud.department) || [];

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        department: user.department, // Legacy field
        departments: userDepartments, // NEW: Multi-department support
        roles: user.roles?.map((ur) => ur.role.name) || [],
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const session = await (this.prisma as PrismaClientLike).session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
            departments: {
              // NEW: Include departments for multi-department support
              include: {
                department: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw CustomException.unauthorized(
        ErrorCodes.AUTH.TOKEN_EXPIRED,
        "Invalid or expired refresh token"
      );
    }

    // Delete old session
    await (this.prisma as PrismaClientLike).session.delete({
      where: { id: session.id },
    });

    // Create new tokens
    return this.login(session.user);
  }

  private generateRefreshToken(payload: Record<string, unknown>): string {
    const refreshJti = randomUUID();
    return this.jwtService.sign(
      { ...payload, jti: refreshJti },
      {
        expiresIn: this.configService.get("JWT_REFRESH_EXPIRES", "7d"),
      }
    );
  }

  private isRefreshTokenUniqueError(
    error: unknown
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      (error.meta?.target as string[]).includes("refresh_token")
    );
  }

  async logout(userId: string) {
    // Delete all sessions for user
    await (this.prisma as PrismaClientLike).session.deleteMany({
      where: { userId },
    });

    // Audit log
    await (this.prisma as PrismaClientLike).auditLog.create({
      data: {
        userId,
        action: "LOGOUT",
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw CustomException.unauthorized(
        ErrorCodes.AUTH.USER_NOT_FOUND,
        "User not found"
      );
    }
    
    // Convert roles to string array (consistent with login endpoint)
    const roleNames = user.roles?.map((r) => r.name) || [];
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      department: user.department, // Legacy field
      departments: user.departments || [], // NEW: Multi-department support
      roles: roleNames, // Convert Role[] to string[]
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
