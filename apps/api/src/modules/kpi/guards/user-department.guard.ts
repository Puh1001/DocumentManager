import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from "@nestjs/common";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { UserDepartmentResolver } from "../services/user-department.resolver";

/**
 * Guard that resolves user's department information and attaches it to the request.
 * This optimizes performance by resolving department once per request instead of
 * in each controller method.
 */
@Injectable()
export class UserDepartmentGuard implements CanActivate {
  private readonly logger = new Logger(UserDepartmentGuard.name);

  constructor(
    private readonly userDepartmentResolver: UserDepartmentResolver
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Ensure user is authenticated (should be handled by JwtAuthGuard)
    if (!request.user) {
      this.logger.warn(
        "UserDepartmentGuard: No authenticated user found in request"
      );
      return false;
    }

    try {
      // Resolve user with departments information (multi-department support)
      const userWithDepartments =
        await this.userDepartmentResolver.getUserWithDepartments(
          request.user.id
        );

      // Attach to request for use in controllers
      request.userWithDepartment = userWithDepartments;

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to resolve user departments for user ${request.user.id}`,
        error
      );
      return false;
    }
  }
}
