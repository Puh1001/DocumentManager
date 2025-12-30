/**
 * Error codes for the application
 * Format: {module}.{action}.{error_type}
 */
export const ErrorCodes = {
  AUTH: {
    LOGIN_INVALID_CREDENTIALS: "auth.login.invalid_credentials",
    TOKEN_EXPIRED: "auth.token.expired",
    TOKEN_INVALID: "auth.token.invalid",
    USER_NOT_FOUND: "auth.user.not_found",
  },
  USER: {
    NOT_FOUND: "user.not_found",
    USERNAME_EXISTS: "user.create.username_exists",
    EMAIL_EXISTS: "user.create.email_exists",
    USERNAME_OR_EMAIL_EXISTS: "user.create.username_or_email_exists",
  },
  DEPARTMENT: {
    NOT_FOUND: "department.not_found",
    CODE_EXISTS: "department.create.code_exists",
    LOAD_FAILED: "department.list.load_failed",
    FETCH_FAILED: "department.fetch.failed",
  },
  FOLDER: {
    NOT_FOUND: "folder.not_found",
    PARENT_NOT_FOUND: "folder.create.parent_not_found",
    DELETED: "folder.deleted",
    TREE_FETCH_FAILED: "folder.tree.fetch_failed",
  },
  DOCUMENT: {
    NOT_FOUND: "document.not_found",
    FOLDER_REQUIRED: "document.upload.folder_required",
    FILE_REQUIRED: "document.upload.file_required",
    FOLDER_NOT_FOUND: "document.upload.folder_not_found",
  },
  VERSION: {
    NOT_FOUND: "version.not_found",
    DOCUMENT_NOT_FOUND: "version.document.not_found",
  },
  KPI: {
    RECORD_NOT_FOUND: "kpi.record.not_found",
    METRIC_NOT_FOUND: "kpi.metric.not_found",
  },
  MAINTENANCE: {
    NOT_FOUND: "maintenance.not_found",
    INVALID_DATES: "maintenance.invalid_dates",
    FETCH_FAILED: "maintenance.fetch.failed",
  },
  PERMISSION: {
    NOT_FOUND: "permission.not_found",
    ROLE_NOT_FOUND: "permission.role.not_found",
    FOLDER_NOT_FOUND: "permission.folder.not_found",
    DOCUMENT_NOT_FOUND: "permission.document.not_found",
    PERMISSIONS_NOT_FOUND: "permission.permissions.not_found",
    USER_NOT_FOUND: "permission.user.not_found",
    INVALID_SUBJECT: "permission.invalid_subject",
    NAME_EXISTS: "permission.create.name_exists",
    IN_USE: "permission.delete.in_use",
  },
  ROLE: {
    NOT_FOUND: "role.not_found",
    NAME_EXISTS: "role.create.name_exists",
    IN_USE: "role.delete.in_use",
    SYSTEM_ROLE: "role.delete.system_role",
  },
  MODULE: {
    NOT_FOUND: "module.not_found",
    NAME_EXISTS: "module.create.name_exists",
    IN_USE: "module.delete.in_use",
  },
  NOT_FOUND: "not_found",
  INVALID_INPUT: "invalid_input",
} as const;

// Type for error code values
export type ErrorCode =
  (typeof ErrorCodes)[keyof typeof ErrorCodes][keyof (typeof ErrorCodes)[keyof typeof ErrorCodes]];
