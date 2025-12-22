"use client";

import { useEffect, useRef } from "react";
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

export function useFolderSync({
  onSyncEvent,
  folderId,
  enabled = true,
}: UseFolderSyncOptions = {}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Get token from localStorage
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("No access token found, skipping WebSocket connection");
      return;
    }

    // Connect to WebSocket
    const socket = io(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010"}/storage`,
      {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      }
    );

    socketRef.current = socket;

    // Connection handlers
    socket.on("connect", () => {
      console.log("WebSocket connected");

      // Subscribe to folder updates
      if (folderId) {
        socket.emit("subscribe-folder", { folderId });
        console.log(`Subscribed to folder: ${folderId}`);
      } else {
        socket.emit("subscribe-folder", {});
        console.log("Subscribed to all folders");
      }
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    // Listen to sync events
    socket.on("sync-event", (event: SyncEvent) => {
      console.log("Sync event received:", event);
      if (onSyncEvent) {
        onSyncEvent(event);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        if (folderId) {
          socket.emit("unsubscribe-folder", { folderId });
        } else {
          socket.emit("unsubscribe-folder", {});
        }
      }
      socket.disconnect();
    };
  }, [enabled, onSyncEvent]);

  // Subscribe/unsubscribe when folderId changes (if socket is already connected)
  useEffect(() => {
    if (!enabled) return;
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    // Subscribe to new folder
    if (folderId) {
      socket.emit("subscribe-folder", { folderId });
      console.log(`Subscribed to folder: ${folderId} (folderId changed)`);
    } else {
      socket.emit("subscribe-folder", {});
      console.log("Subscribed to all folders (folderId changed)");
    }
  }, [folderId, enabled]);

  return {
    isConnected: socketRef.current?.connected || false,
  };
}
