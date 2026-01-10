export const PERMISSION_ACTIONS = {
  VIEW: "view",
  DOWNLOAD: "download",
  PRINT: "print",
  COPY: "copy",
  EDIT: "edit",
  CREATE: "create",
  DELETE: "delete",
  MANAGE: "manage",
} as const;

export const PERMISSION_SUBJECTS = {
  DOCUMENT: "Document",
  FOLDER: "Folder",
  USER: "User",
  KPI: "Kpi",
  ALL: "all",
} as const;

export const DEFAULT_PERMISSIONS = [
  { name: "view", description: "Xem nội dung document" },
  { name: "download", description: "Tải file về máy" },
  { name: "print", description: "In document" },
  { name: "copy", description: "Sao chép nội dung" },
  { name: "edit", description: "Mở để chỉnh sửa (local app)" },
  { name: "create", description: "Tạo document mới" },
  { name: "delete", description: "Xóa document" },
  { name: "manage", description: "Quản lý permissions" },
] as const;
