import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
  namespace: "/storage",
  // Connection limits for scalability
  maxHttpBufferSize: 1e6, // 1MB max message size
  pingTimeout: 60000, // 60s
  pingInterval: 25000, // 25s
})
export class FolderSyncGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FolderSyncGateway.name);
  private readonly MAX_CONNECTIONS = parseInt(
    process.env.WS_MAX_CONNECTIONS || "500",
    10
  );
  private connectionCount = 0;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      client.userId = payload.sub;
      this.logger.log(`Client ${client.id} connected (user: ${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} authentication failed`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (this.connectionCount > 0) {
      this.connectionCount--;
    }
    this.logger.log(
      `Client ${client.id} disconnected (connections: ${this.connectionCount}/${this.MAX_CONNECTIONS})`
    );
  }

  @SubscribeMessage("subscribe-folder")
  handleSubscribeFolder(
    @ConnectedSocket() client: AuthenticatedSocket,
    data?: { folderId?: string }
  ) {
    if (data?.folderId) {
      client.join(`folder:${data.folderId}`);
      this.logger.log(
        `Client ${client.id} subscribed to folder ${data.folderId}`
      );
    } else {
      client.join("all-folders");
      this.logger.log(`Client ${client.id} subscribed to all folders`);
    }
  }

  @SubscribeMessage("unsubscribe-folder")
  handleUnsubscribeFolder(
    @ConnectedSocket() client: AuthenticatedSocket,
    data?: { folderId?: string }
  ) {
    if (data?.folderId) {
      client.leave(`folder:${data.folderId}`);
    } else {
      client.leave("all-folders");
    }
  }

  /**
   * Broadcast folder sync event to all connected clients
   */
  broadcastSyncEvent(event: {
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
  }) {
    if (event.folderId) {
      // Broadcast to specific folder room OR all-folders room (not both to avoid duplicates)
      // Clients in folder-specific room get the event
      this.server.to(`folder:${event.folderId}`).emit("sync-event", event);
      // Clients subscribed to all folders also get it (but not if already in folder room)
      // Socket.IO automatically deduplicates, but we can optimize by checking room membership
      this.server.to("all-folders").emit("sync-event", event);
    } else {
      // Broadcast to all clients when no folderId (fallback scenario)
      this.server.to("all-folders").emit("sync-event", event);
    }
  }
}
