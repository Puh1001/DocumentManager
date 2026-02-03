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
    CHANGE_PASSWORD_INVALID_CURRENT: "auth.change_password.invalid_current",
  },
  USER: {
    NOT_FOUND: "user.not_found",
    INVALID_ID: "user.invalid_id",
    USERNAME_EXISTS: "user.create.username_exists",
    EMAIL_EXISTS: "user.create.email_exists",
    USERNAME_OR_EMAIL_EXISTS: "user.create.username_or_email_exists",
  },
  DEPARTMENT: {
    NOT_FOUND: "department.not_found",
    CODE_EXISTS: "department.create.code_exists",
    LOAD_FAILED: "department.list.load_failed",
    FETCH_FAILED: "department.fetch.failed",
    NOT_ASSIGNED: "department.not_assigned", // User not assigned to department
    ALREADY_ASSIGNED: "department.already_assigned", // User already assigned
  },
  FOLDER: {
    NOT_FOUND: "folder.not_found",
    PARENT_NOT_FOUND: "folder.create.parent_not_found",
    DELETED: "folder.deleted",
    TREE_FETCH_FAILED: "folder.tree.fetch_failed",
    ACCESS_DENIED: "folder.access_denied",
  },
  DOCUMENT: {
    NOT_FOUND: "document.not_found",
    ACCESS_DENIED: "document.access_denied",
    FOLDER_REQUIRED: "document.upload.folder_required",
    FILE_REQUIRED: "document.upload.file_required",
    FOLDER_NOT_FOUND: "document.upload.folder_not_found",
    LEVEL_REQUIRED: "document.upload.level_required",
    INVALID_LEVEL: "document.upload.invalid_level",
    FOLDER_ACCESS_DENIED: "document.upload.folder_access_denied",
    INVALID_FILENAME: "document.rename.invalid_filename",
  },
  VERSION: {
    NOT_FOUND: "version.not_found",
    DOCUMENT_NOT_FOUND: "version.document.not_found",
  },
  KPI: {
    RECORD_NOT_FOUND: "kpi.record.not_found",
    METRIC_NOT_FOUND: "kpi.metric.not_found",
    ACCESS_DENIED: "kpi.access.denied",
    ACCESS_DENIED_NO_DEPARTMENT: "kpi.access.denied.no_department",
    ACCESS_DENIED_DIFFERENT_DEPARTMENT:
      "kpi.access.denied.different_department",
    DEPARTMENT_MISMATCH: "kpi.department.mismatch",
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
