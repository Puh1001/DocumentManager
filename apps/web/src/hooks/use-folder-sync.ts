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

// Get WebSocket URL - use same base as API but direct connection (no proxy)
function getWebSocketUrl(): string {
  if (typeof window === "undefined") {
    return "http://localhost:3001/storage";
  }

  // Ưu tiên cấu hình tường minh qua NEXT_PUBLIC_WS_URL
  const explicitWs = process.env.NEXT_PUBLIC_WS_URL;
  if (explicitWs) {
    return explicitWs.replace(/[/:]+$/, "") + "/storage";
  }

  // Fallback: dùng API URL và chuyển http -> ws
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const normalized = apiUrl.replace(/[/:]+$/, "");
    const wsUrl = normalized.replace(/^http/, "ws");
    return `${wsUrl}/storage`;
  }

  // Fallback: use same origin with different port (for dev)
  // In production, this should be set via env var
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname;
  const port = hostname === "localhost" ? "3001" : window.location.port;
  return `${protocol}//${hostname}:${port}/storage`;
}

export function useFolderSync({
  onSyncEvent,
  folderId,
  enabled = true,
}: UseFolderSyncOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const onSyncEventRef = useRef(onSyncEvent);
  const folderIdRef = useRef(folderId);

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

    // Get token from localStorage
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("No access token found, skipping WebSocket connection");
      return;
    }

    // Don't reconnect if already connected
    // folderId changes are handled in a separate useEffect below
    if (socketRef.current?.connected) {
      return;
    }

    // Connect to WebSocket
    const wsUrl = getWebSocketUrl();
    console.log(`Connecting to WebSocket: ${wsUrl}`);

    const socket = io(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on("connect", () => {
      console.log("WebSocket connected");
      subscribeToFolder(socket, folderIdRef.current);
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      // Only log if not a normal disconnect
      if (reason === "io server disconnect") {
        // Server disconnected, reconnect manually
        socket.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message);
      // Don't spam console - errors are expected during reconnection
    });

    // Listen to sync events
    socket.on("sync-event", (event: SyncEvent) => {
      console.log("Sync event received:", event);
      if (onSyncEventRef.current) {
        onSyncEventRef.current(event);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.emit(
          "unsubscribe-folder",
          folderIdRef.current ? { folderId: folderIdRef.current } : {}
        );
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
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
