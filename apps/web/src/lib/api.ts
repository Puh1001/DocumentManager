const API_BASE = "/api";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryCount?: number;
}

interface ApiError extends Error {
  errorCode?: string;
  statusCode?: number;
}

class ApiClient {
  private refreshPromise: Promise<void> | null = null;
  private isRefreshing = false;

  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refreshToken");
    }
    return null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return exp < Date.now();
    } catch {
      return true; // If we can't parse, consider it expired
    }
  }

  private isTokenExpiringSoon(token: string, thresholdMinutes = 1): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const threshold = thresholdMinutes * 60 * 1000; // Convert minutes to milliseconds
      return exp - Date.now() < threshold;
    } catch {
      return true;
    }
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    // If already refreshing, wait for the ongoing refresh
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Check if we have a refresh token
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Start refresh process
    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh(refreshToken);

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
      this.isRefreshing = false;
    }
  }

  private async doRefresh(refreshToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed, clear tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");

          // Extract locale from current pathname or use default
          const pathname = window.location.pathname;
          const localeMatch = pathname.match(/^\/(en|vi|zh)/);
          const locale = localeMatch ? localeMatch[1] : "en"; // Default to 'en'

          // Redirect to locale-aware login page
          const loginPath = `/${locale}/login`;
          if (!pathname.includes("/login")) {
            window.location.href = loginPath;
          }
        }
        throw new Error("Refresh token expired or invalid");
      }

      const data = await response.json();

      // Update tokens in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      }
    } catch (error) {
      // Clear tokens on any error
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
      throw error;
    }
  }

  private async ensureValidToken(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    // Check if token is expired or expiring soon
    if (this.isTokenExpired(token) || this.isTokenExpiringSoon(token)) {
      await this.refreshTokenIfNeeded();
      return this.getToken();
    }

    return token;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, retryCount = 0, ...fetchOptions } = options;

    // Ensure we have a valid token before making the request
    if (!skipAuth) {
      await this.ensureValidToken();
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 Unauthorized - try to refresh token and retry
    if (response.status === 401 && !skipAuth && retryCount === 0) {
      try {
        await this.refreshTokenIfNeeded();
        // Retry the original request with new token
        return this.request<T>(endpoint, { ...options, retryCount: 1 });
      } catch (error) {
        // Refresh failed, throw the original 401 error
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unauthorized" }));
        throw new Error(errorData.message || "Unauthorized");
      }
    }

    if (!response.ok) {
      let error: { message?: string; errorCode?: string; statusCode?: number };
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          error = await response.json();
        } else {
          const text = await response.text();
          error = { message: text || `HTTP ${response.status} Error` };
        }
      } catch {
        error = { message: `HTTP ${response.status} Error` };
      }

      // Create error object with errorCode if available
      const errorObj = new Error(
        error.message || `HTTP ${response.status}`,
      ) as ApiError;
      errorObj.errorCode = error.errorCode;
      errorObj.statusCode = error.statusCode || response.status;
      throw errorObj;
    }

    // Handle empty responses (e.g., 204 No Content for DELETE)
    if (response.status === 204) {
      return { success: true } as T;
    }

    // Check content type before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // For non-JSON responses, return success object
      return { success: true } as T;
    }

    // Try to parse JSON, but handle empty responses gracefully
    const text = await response.text();
    if (!text || text.trim() === "") {
      return { success: true } as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      // If parsing fails, return the text as-is (shouldn't happen for valid JSON)
      return { success: true, data: text } as T;
    }
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Fetch a file as blob with authentication
   * Returns a blob URL that can be used in iframe, img, etc.
   */
  async fetchFileAsBlobUrl(endpoint: string): Promise<string> {
    await this.ensureValidToken();

    const token = this.getToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token and retry once
        try {
          await this.refreshTokenIfNeeded();
          const newToken = this.getToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
          }
          const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
            method: "GET",
            headers,
          });
          if (!retryResponse.ok) {
            throw new Error(`Failed to fetch file: ${retryResponse.status}`);
          }
          const blob = await retryResponse.blob();
          return URL.createObjectURL(blob);
        } catch (error) {
          throw new Error("Unauthorized: Failed to fetch file");
        }
      }
      throw new Error(`Failed to fetch file: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  /**
   * Fetch a file as ArrayBuffer with authentication
   */
  async fetchFileAsArrayBuffer(endpoint: string): Promise<ArrayBuffer> {
    await this.ensureValidToken();

    const token = this.getToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token and retry once
        try {
          await this.refreshTokenIfNeeded();
          const newToken = this.getToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
          }
          const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
            method: "GET",
            headers,
          });
          if (!retryResponse.ok) {
            throw new Error(`Failed to fetch file: ${retryResponse.status}`);
          }
          return await retryResponse.arrayBuffer();
        } catch (error) {
          throw new Error("Unauthorized: Failed to fetch file");
        }
      }
      throw new Error(`Failed to fetch file: ${response.status}`);
    }

    return await response.arrayBuffer();
  }

  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    retryCount = 0,
  ): Promise<T> {
    // Ensure we have a valid token before making the request
    await this.ensureValidToken();

    const formData = new FormData();
    formData.append("file", file);

    // Gửi filename riêng như text field (UTF-8 thô, không qua Content-Disposition header)
    // Điều này tránh vấn đề encoding khi Multer parse filename từ header
    formData.append("fileName", file.name);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value != null && value !== "") {
          formData.append(key, value);
        }
      });
    }

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    // Handle 401 Unauthorized - try to refresh token and retry
    if (response.status === 401 && retryCount === 0) {
      try {
        await this.refreshTokenIfNeeded();
        // Retry the upload with new token
        return this.upload<T>(endpoint, file, additionalData, 1);
      } catch (error) {
        // Refresh failed, throw the original 401 error
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unauthorized" }));
        const errorObj = new Error(
          errorData.message || "Unauthorized",
        ) as ApiError;
        errorObj.errorCode = errorData.errorCode;
        errorObj.statusCode = 401;
        throw errorObj;
      }
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Upload failed" }));
      const errorObj = new Error(error.message) as ApiError;
      errorObj.errorCode = error.errorCode;
      errorObj.statusCode = error.statusCode || response.status;
      throw errorObj;
    }

    return response.json();
  }

  uploadWithProgress<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    onProgress?: (progress: {
      loaded: number;
      total: number;
      percentage: number;
      speed: number;
      eta: number;
    }) => void,
    retryCount = 0,
  ): { promise: Promise<T>; abort: () => void } {
    const formData = new FormData();
    formData.append("file", file);

    // Gửi filename riêng như text field (UTF-8 thô, không qua Content-Disposition header)
    formData.append("fileName", file.name);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value != null && value !== "") {
          formData.append(key, value);
        }
      });
    }

    // Ensure we have a valid token before making the request
    const tokenPromise = this.ensureValidToken();
    const xhr = new XMLHttpRequest();

    // Track upload progress
    let lastLoaded = 0;
    let lastTime = Date.now();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const loaded = e.loaded;
        const total = e.total;
        const percentage = Math.round((loaded / total) * 100);

        // Calculate speed (bytes per second)
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000; // seconds
        const bytesDiff = loaded - lastLoaded;
        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

        // Calculate ETA (seconds)
        const remaining = total - loaded;
        const eta = speed > 0 ? remaining / speed : 0;

        onProgress({
          loaded,
          total,
          percentage,
          speed,
          eta,
        });

        lastLoaded = loaded;
        lastTime = currentTime;
      }
    });

    const promise = tokenPromise.then(async () => {
      return new Promise<T>((resolve, reject) => {
        xhr.addEventListener("load", async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error("Failed to parse response"));
            }
          } else if (xhr.status === 401 && retryCount === 0) {
            // Handle 401 - try to refresh and retry
            try {
              await this.refreshTokenIfNeeded();
              // Retry the upload with new token
              const retryResult = this.uploadWithProgress<T>(
                endpoint,
                file,
                additionalData,
                onProgress,
                1,
              );
              retryResult.promise.then(resolve).catch(reject);
            } catch (error) {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.message || "Unauthorized"));
              } catch {
                reject(new Error("Unauthorized"));
              }
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.message || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed: Network error"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        xhr.open("POST", `${API_BASE}${endpoint}`);

        const currentToken = this.getToken();
        if (currentToken) {
          xhr.setRequestHeader("Authorization", `Bearer ${currentToken}`);
        }

        xhr.send(formData);
      });
    });

    return {
      promise,
      abort: () => xhr.abort(),
    };
  }
}

export const api = new ApiClient();

// Department types and API methods
import type { Department } from "@/lib/types/department.types";
export type { Department };

export interface CreateDepartmentDto {
  code: string;
  name?: string; // Vietnamese name (for backward compatibility)
  nameEn?: string; // English name
  nameVi?: string; // Vietnamese name
  nameZh?: string; // Chinese name
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  code?: string;
  name?: string; // Vietnamese name (for backward compatibility)
  nameEn?: string; // English name
  nameVi?: string; // Vietnamese name
  nameZh?: string; // Chinese name
  isActive?: boolean;
}

export const departmentApi = {
  getAll: () => api.get<Department[]>("/departments"),
  getById: (id: string) => api.get<Department>(`/departments/${id}`),
  create: (data: CreateDepartmentDto) =>
    api.post<Department>("/departments", data),
  update: (id: string, data: UpdateDepartmentDto) =>
    api.patch<Department>(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

/**
 * Get department name based on locale
 * @param department - Department object
 * @param locale - Current locale (en, vi, zh)
 * @returns Department name in the specified locale, falls back to Vietnamese or code
 */
export function getDepartmentName(
  department: Department,
  locale: string = "vi",
): string {
  if (locale === "en" && department.nameEn) {
    return department.nameEn;
  }
  if (locale === "zh" && department.nameZh) {
    return department.nameZh;
  }
  // Default to Vietnamese
  return department.nameVi || department.name || department.code;
}

// Maintenance Notice types and API methods
export interface MaintenanceNotice {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  departmentId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  creator?: {
    id: string;
    username: string;
    fullName: string;
  };
}

export interface CreateMaintenanceNoticeDto {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  departmentId?: string;
}

export interface UpdateMaintenanceNoticeDto {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export const maintenanceApi = {
  getAll: () => api.get<MaintenanceNotice[]>("/maintenance"),
  getById: (id: string) => api.get<MaintenanceNotice>(`/maintenance/${id}`),
  create: (data: CreateMaintenanceNoticeDto) =>
    api.post<MaintenanceNotice>("/maintenance", data),
  update: (id: string, data: UpdateMaintenanceNoticeDto) =>
    api.patch<MaintenanceNotice>(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
};

// User types and API methods
export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface User {
  departments?: Department[]; // NEW: Multi-department support
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  roles: Role[];
}

export interface PaginatedUsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  fullName: string;
  department?: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  fullName?: string;
  department?: string;
  isActive?: boolean;
}

export interface QueryUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  isActive?: boolean;
}

export const userApi = {
  getAll: (params?: QueryUsersParams) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.department) queryParams.append("department", params.department);
    if (params?.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    const query = queryParams.toString();
    return api.get<PaginatedUsersResponse>(`/users${query ? `?${query}` : ""}`);
  },
  /** List active users for assignee dropdowns (reviewer/approver). Uses edit:Document policy so editors can load list. */
  getForAssignees: (params?: { limit?: number; isActive?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    const query = queryParams.toString();
    return api.get<PaginatedUsersResponse>(
      `/users/for-assignees${query ? `?${query}` : ""}`,
    );
  },
  getById: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: CreateUserDto) => api.post<User>("/users", data),
  update: (id: string, data: UpdateUserDto) =>
    api.patch<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  hardDelete: (id: string) => api.delete(`/users/${id}/hard`),
  reactivate: (id: string) => api.post(`/users/${id}/reactivate`, {}),
  assignRole: (userId: string, roleId: string) =>
    api.post(`/users/${userId}/roles/${roleId}`, {}),
  removeRole: (userId: string, roleId: string) =>
    api.delete(`/users/${userId}/roles/${roleId}`),
  // NEW: Department management methods
  getDepartments: (userId: string) =>
    api.get<Department[]>(`/users/${userId}/departments`),
  assignDepartments: (userId: string, departmentIds: string[]) =>
    api.post<{ message: string }>(`/users/${userId}/departments`, {
      departmentIds,
    }),
  removeDepartment: (userId: string, departmentId: string) =>
    api.delete<{ message: string }>(
      `/users/${userId}/departments/${departmentId}`,
    ),
};

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// User type for auth endpoints (roles as string[])
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string | null;
  departments?: Department[];
  roles: string[]; // Auth endpoints return role names as strings
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export const authApi = {
  getMe: () => api.get<AuthUser>("/auth/me"),
  changePassword: (data: ChangePasswordDto) =>
    api.post<{ message: string }>("/auth/change-password", data),
};

// Role types and API methods
export interface PaginatedRolesResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
}

export interface QueryRolesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const roleApi = {
  getAll: (params?: QueryRolesParams) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    const query = queryParams.toString();
    return api.get<PaginatedRolesResponse>(`/roles${query ? `?${query}` : ""}`);
  },
  getById: (id: string) => api.get<Role>(`/roles/${id}`),
  create: (data: CreateRoleDto) => api.post<Role>("/roles", data),
  update: (id: string, data: UpdateRoleDto) =>
    api.patch<Role>(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

// Permission types and API methods
export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface AssignRolePermissionsDto {
  permissionIds: string[];
}

export const permissionApi = {
  getAll: () => api.get<Permission[]>("/permissions"),
  getById: (id: string) => api.get<Permission>(`/permissions/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<Permission>("/permissions", data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<Permission>(`/permissions/${id}`, data),
  delete: (id: string) => api.delete(`/permissions/${id}`),
  getRolePermissions: (roleId: string) =>
    api.get<RoleWithPermissions>(`/permissions/roles/${roleId}`),
  assignRolePermissions: (roleId: string, data: AssignRolePermissionsDto) =>
    api.post<RoleWithPermissions>(`/permissions/roles/${roleId}`, data),
};

// Module types and API methods
export interface Module {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModuleDto {
  name: string;
  displayName: string;
  description?: string;
}

export interface UpdateModuleDto {
  name?: string;
  displayName?: string;
  description?: string | null;
  isActive?: boolean;
}

export const moduleApi = {
  getAll: () => api.get<Module[]>("/modules"),
  getById: (id: string) => api.get<Module>(`/modules/${id}`),
  create: (data: CreateModuleDto) => api.post<Module>("/modules", data),
  update: (id: string, data: UpdateModuleDto) =>
    api.patch<Module>(`/modules/${id}`, data),
  delete: (id: string) => api.delete(`/modules/${id}`),
};

// KPI Attachment types and API methods
export interface KpiAttachment {
  id: string;
  documentId: string;
  fileName: string;
  uploadedBy: string;
  createdAt: string;
  month?: number | null;
  description?: string | null;
  deletionExpiresAt?: string | null;
}

export interface ClearKpiMonthResult {
  month: number;
  metricsCleared: boolean;
  attachmentsDeleted: number;
  attachmentsFailed: Array<{ attachmentId: string; reason: string }>;
}

export const kpiRecordApi = {
  clearMonth: (recordId: string, month: number) =>
    api.delete<ClearKpiMonthResult>(
      `/kpi/records/${recordId}/months/${month}`,
    ),
  deleteRecord: (recordId: string) =>
    api.delete<{ success?: boolean }>(`/kpi/records/${recordId}`),
};

export const kpiAttachmentApi = {
  getAttachments: (kpiRecordId: string, month?: number) =>
    api.get<KpiAttachment[]>(
      `/kpi/records/${kpiRecordId}/attachments${month != null && month >= 1 && month <= 12 ? `?month=${month}` : ""}`,
    ),
  getAttachmentStreamUrl: (attachmentId: string) =>
    `/kpi/attachments/${attachmentId}/stream`,
  downloadAttachment: (attachmentId: string) =>
    api.fetchFileAsArrayBuffer(`/kpi/attachments/${attachmentId}/download`),
  uploadAttachment: (
    kpiRecordId: string,
    file: File,
    folderId: string | undefined,
    description?: string,
    month?: number,
  ) =>
    api.upload<{
      id: string;
      documentId: string;
      month?: number | null;
      description?: string | null;
      createdAt: string;
    }>(`/kpi/records/${kpiRecordId}/attachments`, file, {
      ...(folderId && folderId.trim() !== "" && { folderId }),
      ...(description && { description }),
      ...(month != null &&
        month >= 1 &&
        month <= 12 && { month: String(month) }),
    }),
  getDeletionStatus: (attachmentId: string) =>
    api.get<DeletionStatus>(`/kpi/attachments/${attachmentId}/deletion-status`),
  getDeletionRequest: (attachmentId: string) =>
    api.get<DeletionRequest | null>(
      `/kpi/attachments/${attachmentId}/deletion-request`,
    ),
  submitDeletionRequest: (
    attachmentId: string,
    reason: string,
    replacementFileId?: string,
  ) =>
    api.post<DeletionRequest>(
      `/kpi/attachments/${attachmentId}/deletion-request`,
      { reason, replacementFileId },
    ),
  deleteAttachment: (attachmentId: string) =>
    api.delete<{ success: boolean }>(`/kpi/attachments/${attachmentId}`),
  renameAttachment: (attachmentId: string, data: RenameDocumentDto) =>
    api.patch<{
      id: string;
      documentId: string;
      fileName: string;
      name: string;
    }>(`/kpi/attachments/${attachmentId}/rename`, data),
};

// Deletion Request types and API methods
export interface DeletionStatus {
  canDelete: boolean;
  isExpired: boolean;
  remainingHours: number;
  requiresDCCApproval: boolean;
  hasActiveRequest: boolean;
  requestId?: string;
}

export interface DeletionRequest {
  id: string;
  documentId: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  replacementFileId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewerComment?: string | null;
  document?: {
    id: string;
    name: string;
    fileName: string;
    folder: { name: string };
  };
  requester?: {
    id: string;
    fullName: string;
    username: string;
  };
  replacementFile?: {
    id: string;
    name: string;
  } | null;
}

export interface SubmitDeletionRequestDto {
  reason: string;
  replacementFileId?: string;
}

export interface ReviewDeletionRequestDto {
  approve: boolean;
  comment?: string;
}

export interface RenameDocumentDto {
  name: string;
  fileName: string;
}

export interface UpdateIsoMetadataDto {
  levelId?: string;
  preparerName?: string | null;
  reviewerName?: string | null;
  approverName?: string | null;
  approvalDate?: string | null;
  receiptDate?: string | null;
  storageLocation?: string | null;
  documentNo?: string | null;
  revisionLabel?: string | null;
}

export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export const documentApi = {
  rename: (documentId: string, data: RenameDocumentDto) =>
    api.patch<Document>(`/storage/documents/${documentId}/rename`, data),
  updateIsoMetadata: (documentId: string, data: UpdateIsoMetadataDto) =>
    api.patch<Document>(`/storage/documents/${documentId}/iso-metadata`, data),
};

export const deletionRequestApi = {
  getDeletionStatus: (documentId: string) =>
    api.get<DeletionStatus>(`/storage/documents/${documentId}/deletion-status`),

  submitDeletionRequest: (documentId: string, data: SubmitDeletionRequestDto) =>
    api.post<DeletionRequest>(
      `/storage/documents/${documentId}/deletion-requests`,
      data,
    ),

  listPending: () => api.get<DeletionRequest[]>("/storage/deletion-requests"),

  getById: (id: string) =>
    api.get<DeletionRequest>(`/storage/deletion-requests/${id}`),

  review: (id: string, data: ReviewDeletionRequestDto) =>
    api.post<DeletionRequest>(`/storage/deletion-requests/${id}/review`, data),
};

// Client files (dashboard Client page)
export interface ClientFileItem {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string | null;
  uploadedAt: string | null;
  createdAt: string;
}

export interface ListClientFilesParams {
  search?: string;
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ListClientFilesResponse {
  data: ClientFileItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const clientFilesApi = {
  getList: (params?: ListClientFilesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.search != null && params.search !== "")
      searchParams.set("search", params.search);
    if (params?.fileType != null && params.fileType !== "")
      searchParams.set("fileType", params.fileType);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    if (params?.page != null) searchParams.set("page", String(params.page));
    if (params?.limit != null) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return api.get<ListClientFilesResponse>(
      `/client/files${query ? `?${query}` : ""}`,
    );
  },

  upload: (file: File) =>
    api.upload<{
      id: string;
      name: string;
      fileName: string;
      fileType: string;
    }>("/client/files/upload", file),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/client/files/${id}`),
};
