/**
 * User type definition
 */
import type { Department } from "./department.types";

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string | null; // LEGACY - kept for backward compatibility
  departments?: Department[]; // NEW: Multi-department support
  roles: string[];
}
