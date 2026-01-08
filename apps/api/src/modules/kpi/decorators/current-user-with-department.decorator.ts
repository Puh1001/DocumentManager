import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { UserWithDepartments } from "../services/user-department.resolver";

/**
 * Parameter decorator that extracts UserWithDepartments from request.
 * Requires UserDepartmentGuard to be applied to the route.
 *
 * @example
 * ```typescript
 * @Get()
 * async findAll(@CurrentUserWithDepartment() user: UserWithDepartments) {
 *   return this.service.findAll({}, user);
 * }
 * ```
 */
export const CurrentUserWithDepartment = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserWithDepartments => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.userWithDepartment) {
      throw new Error(
        "CurrentUserWithDepartment decorator requires UserDepartmentGuard to be applied"
      );
    }

    return request.userWithDepartment as UserWithDepartments;
  }
);
