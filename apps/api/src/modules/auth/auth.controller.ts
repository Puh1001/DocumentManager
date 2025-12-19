import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { Request as ExpressRequest } from "express";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { UserWithRoles } from "@/common/types/prisma.types";

// Request type for login endpoint - user comes from LocalStrategy as UserWithRoles
interface LoginRequest extends ExpressRequest {
  user: UserWithRoles;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with username and password" })
  async login(@Request() req: LoginRequest, @Body() _loginDto: LoginDto) {
    return this.authService.login(req.user, req.ip, req.headers["user-agent"]);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout and invalidate session" })
  async logout(@Request() req: AuthenticatedRequest) {
    await this.authService.logout(req.user.id);
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user info" })
  async me(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }
}
