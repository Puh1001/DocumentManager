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
  },
  FOLDER: {
    NOT_FOUND: "folder.not_found",
    PARENT_NOT_FOUND: "folder.create.parent_not_found",
    DELETED: "folder.deleted",
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
  PERMISSION: {
    NOT_FOUND: "permission.not_found",
    ROLE_NOT_FOUND: "permission.role.not_found",
    FOLDER_NOT_FOUND: "permission.folder.not_found",
    DOCUMENT_NOT_FOUND: "permission.document.not_found",
    PERMISSIONS_NOT_FOUND: "permission.permissions.not_found",
    USER_NOT_FOUND: "permission.user.not_found",
    INVALID_SUBJECT: "permission.invalid_subject",
  },
} as const;

// Type for error code values
export type ErrorCode =
  (typeof ErrorCodes)[keyof typeof ErrorCodes][keyof (typeof ErrorCodes)[keyof typeof ErrorCodes]];
