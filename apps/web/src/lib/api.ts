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
          // Optionally redirect to login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
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
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));

      // Create error object with errorCode if available
      const errorObj = new Error(
        error.message || `HTTP ${response.status}`
      ) as ApiError;
      errorObj.errorCode = error.errorCode;
      errorObj.statusCode = error.statusCode || response.status;
      throw errorObj;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
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
    options?: RequestOptions
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

  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    retryCount = 0
  ): Promise<T> {
    // Ensure we have a valid token before making the request
    await this.ensureValidToken();

    const formData = new FormData();
    formData.append("file", file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
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
          errorData.message || "Unauthorized"
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
    retryCount = 0
  ): { promise: Promise<T>; abort: () => void } {
    const formData = new FormData();
    formData.append("file", file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
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
                1
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
export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
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
