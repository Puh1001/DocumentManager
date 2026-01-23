"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface SyncEvent {
  type:
    | "folder_added"
    | "folder_updated"
    | "folder_deleted"
    | "document_added"
    | "document_updated"
    | "document_deleted"
    | "deletion_request_rejected"
    | "deletion_request_approved"
    | "sync_completed";
  folderId?: string;
  documentId?: string;
  data?: unknown;
}

interface UseFolderSyncOptions {
  onSyncEvent?: (event: SyncEvent) => void;
  folderId?: string;
  enabled?: boolean;
}

// Get WebSocket URL - return base URL only, namespace handled by Socket.IO client
function getWebSocketUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Get base URL (without namespace)
  const explicitWs = process.env.NEXT_PUBLIC_WS_URL;
  if (explicitWs) {
    // Return base URL only, namespace handled by socket.io client
    return explicitWs.replace(/[/:]+$/, "");
  }

  // Fallback: use API URL and convert http -> ws
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const normalized = apiUrl.replace(/[/:]+$/, "");
    return normalized.replace(/^http/, "ws");
  }

  console.warn(
    "Missing NEXT_PUBLIC_WS_URL and NEXT_PUBLIC_API_URL; skipping WebSocket connection"
  );
  return null;
}

// Check if JWT token is expired
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return exp < Date.now();
  } catch {
    return true; // If we can't parse, consider it expired
  }
}

// Check if token expires soon (within threshold minutes)
function isTokenExpiringSoon(token: string, thresholdMinutes = 1): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    const threshold = thresholdMinutes * 60 * 1000; // Convert minutes to milliseconds
    return exp - Date.now() < threshold;
  } catch {
    return true;
  }
}

// Global ref to prevent concurrent token refresh attempts
let globalRefreshPromise: Promise<string | null> | null = null;

// Refresh token if expired or expiring soon
async function refreshTokenIfNeeded(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // If already refreshing, return the existing promise
  if (globalRefreshPromise) {
    return globalRefreshPromise;
  }

  const token = localStorage.getItem("accessToken");
  if (!token) {
    return null;
  }

  // Check if token is expired or expiring soon
  if (isTokenExpired(token) || isTokenExpiringSoon(token)) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      console.warn("No refresh token available for WebSocket connection");
      return null;
    }

    // Create refresh promise
    globalRefreshPromise = (async () => {
      try {
        const API_BASE = "/api";
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          console.warn("Failed to refresh token for WebSocket connection");
          // Don't clear tokens here - let ApiClient handle it
          return null;
        }

        const data = await response.json();
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        console.log("Token refreshed for WebSocket connection");
        return data.accessToken;
      } catch (error) {
        console.error("Error refreshing token for WebSocket:", error);
        return null;
      } finally {
        // Clear promise after completion
        globalRefreshPromise = null;
      }
    })();

    return globalRefreshPromise;
  }

  return token;
}

export function useFolderSync({
  onSyncEvent,
  folderId,
  enabled = true,
}: UseFolderSyncOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const onSyncEventRef = useRef(onSyncEvent);
  const folderIdRef = useRef(folderId);
  const connectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when props change (without causing reconnection)
  useEffect(() => {
    onSyncEventRef.current = onSyncEvent;
  }, [onSyncEvent]);

  useEffect(() => {
    folderIdRef.current = folderId;
  }, [folderId]);

  // Subscribe to folder when folderId changes (if already connected)
  const subscribeToFolder = useCallback(
    (socket: Socket, targetFolderId?: string) => {
      if (targetFolderId) {
        socket.emit("subscribe-folder", { folderId: targetFolderId });
        console.log(`Subscribed to folder: ${targetFolderId}`);
      } else {
        socket.emit("subscribe-folder", {});
        console.log("Subscribed to all folders");
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled) {
      // Disconnect if disabled
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Don't reconnect if already connected
    // folderId changes are handled in a separate useEffect below
    if (socketRef.current?.connected) {
      return;
    }

    // Connect to WebSocket with token refresh
    const connectWebSocket = async () => {
      // Prevent duplicate connections
      if (connectingRef.current || socketRef.current?.connected) {
        return;
      }

      connectingRef.current = true;

      try {
        // Get and refresh token if needed
        const token = await refreshTokenIfNeeded();
        if (!token) {
          console.warn(
            "No valid access token available, skipping WebSocket connection"
          );
          return;
        }

        const wsUrl = getWebSocketUrl();
        if (!wsUrl) {
          console.warn(
            "WebSocket URL is not configured; realtime sync disabled"
          );
          return;
        }
        console.log(`Connecting to WebSocket: ${wsUrl}/storage`);

        // Connect to /storage namespace (matches gateway configuration)
        // Disable automatic reconnection - we'll handle it manually after token refresh
        const socket = io(`${wsUrl}/storage`, {
          path: "/socket.io",
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: false, // Disable auto-reconnection to prevent spam
          timeout: 20000,
        });

        socketRef.current = socket;

        // Connection handlers
        socket.on("connect", () => {
          console.log("WebSocket connected");
          connectingRef.current = false;
          // Clear any pending reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          subscribeToFolder(socket, folderIdRef.current);
        });

        socket.on("disconnect", async (reason) => {
          console.log("WebSocket disconnected:", reason);
          connectingRef.current = false;

          // Clear any pending reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }

          if (reason === "io server disconnect") {
            // Server disconnected, refresh token and reconnect after delay
            const newToken = await refreshTokenIfNeeded();
            if (newToken) {
              socket.auth = { token: newToken };
              // Reconnect after a short delay to avoid immediate retry
              reconnectTimeoutRef.current = setTimeout(() => {
                socket.connect();
              }, 2000);
            } else {
              console.warn("Cannot reconnect: token refresh failed");
            }
          }
        });

        socket.on("connect_error", async (error) => {
          connectingRef.current = false;
          const errorMessage = error.message.toLowerCase();

          // Check if it's an authentication error
          if (
            errorMessage.includes("authentication") ||
            errorMessage.includes("unauthorized") ||
            errorMessage.includes("401")
          ) {
            console.warn(
              "WebSocket authentication failed, refreshing token..."
            );

            // Disconnect to stop any pending retries
            socket.disconnect();

            // Refresh token
            const newToken = await refreshTokenIfNeeded();
            if (newToken) {
              // Update auth and manually reconnect after delay
              socket.auth = { token: newToken };
              reconnectTimeoutRef.current = setTimeout(() => {
                socket.connect();
              }, 2000);
            } else {
              console.error(
                "Token refresh failed, stopping connection attempts"
              );
            }
          } else {
            console.error("WebSocket connection error:", error.message);
          }
        });

        // Listen to sync events
        socket.on("sync-event", (event: SyncEvent) => {
          console.log("Sync event received:", event);
          if (onSyncEventRef.current) {
            onSyncEventRef.current(event);
          }
        });
      } catch (error) {
        console.error("Error setting up WebSocket connection:", error);
        connectingRef.current = false;
      }
    };

    // Connect asynchronously
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      const socket = socketRef.current;
      if (socket) {
        if (socket.connected) {
          socket.emit(
            "unsubscribe-folder",
            folderIdRef.current ? { folderId: folderIdRef.current } : {}
          );
        }
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      }
      connectingRef.current = false;
    };
    // folderId is intentionally omitted - we use folderIdRef to avoid reconnections
    // and handle folderId changes in a separate useEffect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, subscribeToFolder]);

  // Update subscription when folderId changes (if socket is already connected)
  useEffect(() => {
    if (!enabled) return;
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    subscribeToFolder(socket, folderId);
  }, [folderId, enabled, subscribeToFolder]);

  return {
    isConnected: socketRef.current?.connected || false,
  };
}
