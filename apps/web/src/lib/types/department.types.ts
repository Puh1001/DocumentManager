/**
 * Department type definition
 * Matches the API response structure
 */
export interface Department {
  id: string;
  name: string; // Vietnamese name (for backward compatibility)
  nameEn?: string; // English name
  nameVi?: string; // Vietnamese name
  nameZh?: string; // Chinese name
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
