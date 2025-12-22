import { SetMetadata } from "@nestjs/common";
import { Actions, Subjects } from "../types/ability.types";
import { MongoQuery } from "@casl/ability";

export interface PolicyHandler {
  action: Actions;
  subject: Subjects | "all";
  conditions?: MongoQuery;
}

export const CHECK_POLICIES_KEY = "check_policies";

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
