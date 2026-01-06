import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { UserWithDepartment } from "../services/user-department.resolver";

/**
 * Parameter decorator that extracts UserWithDepartment from request.
 * Requires UserDepartmentGuard to be applied to the route.
 *
 * @example
 * ```typescript
 * @Get()
 * async findAll(@CurrentUserWithDepartment() user: UserWithDepartment) {
 *   return this.service.findAll({}, user);
 * }
 * ```
 */
export const CurrentUserWithDepartment = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserWithDepartment => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.userWithDepartment) {
      throw new Error(
        "CurrentUserWithDepartment decorator requires UserDepartmentGuard to be applied"
      );
    }

    return request.userWithDepartment;
  }
);

