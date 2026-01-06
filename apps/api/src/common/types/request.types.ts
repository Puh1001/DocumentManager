import { Request } from "express";
import { UserWithDepartment } from "@/modules/kpi/services/user-department.resolver";

export interface AuthenticatedUser {
  id: string;
  username: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  userWithDepartment?: UserWithDepartment;
}
