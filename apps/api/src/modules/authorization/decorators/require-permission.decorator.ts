import { SetMetadata } from "@nestjs/common";
import { Actions, Subjects } from "../types/ability.types";
import { MongoQuery } from "@casl/ability";

export const REQUIRE_PERMISSION_KEY = "require_permission";

export interface RequirePermissionOptions {
  action: Actions;
  subject: Subjects;
  conditions?: MongoQuery;
}

export const RequirePermission = (options: RequirePermissionOptions) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, options);
