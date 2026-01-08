import { Request } from "express";
import { UserWithDepartments } from "@/modules/kpi/services/user-department.resolver";

export interface AuthenticatedUser {
  id: string;
  username: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  userWithDepartment?: UserWithDepartments; // Stores multi-department user info
}
