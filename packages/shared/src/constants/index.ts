// Permission actions
export const PERMISSION_ACTIONS = {
  VIEW: "view",
  DOWNLOAD: "download",
  PRINT: "print",
  EDIT: "edit",
  CREATE: "create",
  DELETE: "delete",
  MANAGE: "manage",
} as const;

// Document status
export const DOCUMENT_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
} as const;

// Role names
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  EDITOR: "editor",
  VIEWER: "viewer",
  BOSS: "boss",
} as const;

// File types supported
export const SUPPORTED_FILE_TYPES = {
  PDF: "pdf",
  DOCX: "docx",
  DOC: "doc",
  XLSX: "xlsx",
  XLS: "xls",
  PPTX: "pptx",
  PPT: "ppt",
  PNG: "png",
  JPG: "jpg",
  JPEG: "jpeg",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
  },
  USERS: "/users",
  FOLDERS: "/storage/folders",
  DOCUMENTS: "/storage/documents",
  PERMISSIONS: "/permissions",
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
