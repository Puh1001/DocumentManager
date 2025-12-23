// User types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface UserWithRoles extends User {
  roles: Role[];
}

// Role types
export interface Role {
  id: string;
  name: string;
  description: string | null;
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, "passwordHash">;
}

export interface RefreshRequest {
  refreshToken: string;
}

// Document types
export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  checksum: string;
  folderId: string;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

// Folder types
export interface Folder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  physicalLocation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderWithChildren extends Folder {
  children: Folder[];
  documents: Document[];
}

// Version types
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  comment: string | null;
  createdBy: string;
  createdAt: Date;
}

// Permission types
export type PermissionAction =
  | "view"
  | "download"
  | "print"
  | "edit"
  | "create"
  | "delete"
  | "manage";

export type SubjectType = "USER" | "ROLE";

export interface Permission {
  id: string;
  name: PermissionAction;
  description: string | null;
}

export interface FolderPermission {
  id: string;
  folderId: string;
  subjectType: SubjectType;
  subjectId: string;
  permissionId: string;
  inherit: boolean;
}

export interface DocumentPermission {
  id: string;
  documentId: string;
  subjectType: SubjectType;
  subjectId: string;
  permissionId: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// File browser types
export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
  mimeType?: string;
}
