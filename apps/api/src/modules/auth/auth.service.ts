import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { PrismaService } from "@/common/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { PrismaClientLike, UserWithRoles } from "@/common/types/prisma.types";

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
      where: { username },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async login(user: UserWithRoles, ipAddress?: string, userAgent?: string) {
    const payload = {
      sub: user.id,
      username: user.username,
      roles: user.roles?.map((ur) => ur.role.name) || [],
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRES", "7d"),
    });

    // Save session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await (this.prisma as PrismaClientLike).session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

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

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        department: user.department,
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
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Delete old session
    await (this.prisma as PrismaClientLike).session.delete({
      where: { id: session.id },
    });

    // Create new tokens
    return this.login(session.user);
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
      throw new UnauthorizedException("User not found");
    }
    return user;
  }
}
