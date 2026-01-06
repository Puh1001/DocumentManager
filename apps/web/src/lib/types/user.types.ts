/**
 * User type definition
 */
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string | null;
  roles: string[];
}
