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
})
export class FolderSyncGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FolderSyncGateway.name);

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
    this.logger.log(`Client ${client.id} disconnected`);
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
      | "sync_completed";
    folderId?: string;
    documentId?: string;
    data?: unknown;
  }) {
    if (event.folderId) {
      // Broadcast to specific folder room AND all-folders room
      // This ensures clients subscribed to specific folder OR all folders both receive the event
      this.server.to(`folder:${event.folderId}`).emit("sync-event", event);
      this.server.to("all-folders").emit("sync-event", event);
      this.logger.debug(
        `Broadcasted sync event: ${event.type} to folder:${event.folderId} and all-folders`
      );
    } else {
      // Broadcast to all clients
      this.server.to("all-folders").emit("sync-event", event);
      this.logger.debug(
        `Broadcasted sync event: ${event.type} to all-folders (no folderId)`
      );
    }
  }
}
