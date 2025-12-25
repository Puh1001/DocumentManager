import { Injectable } from "@nestjs/common";
import { DocumentService } from "./document.service";
import { FolderService } from "./folder.service";
import { UsersService } from "@/modules/users/users.service";

export interface StatsResponse {
  totalDocuments: number;
  totalFolders: number;
  totalUsers: number;
  recentUploads: number;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly folderService: FolderService,
    private readonly usersService: UsersService
  ) {}

  async getStats(): Promise<StatsResponse> {
    try {
      const [totalDocuments, totalFolders, totalUsers, recentUploads] =
        await Promise.all([
          this.documentService.count(),
          this.folderService.count(),
          this.usersService.count(),
          this.documentService.countRecent(7), // Last 7 days
        ]);

      return {
        totalDocuments,
        totalFolders,
        totalUsers,
        recentUploads,
      };
    } catch (error) {
      // Log error for debugging
      console.error("Error in getStats():", error);

      // Return default values to prevent complete failure
      // This allows the dashboard to still load with empty stats
      return {
        totalDocuments: 0,
        totalFolders: 0,
        totalUsers: 0,
        recentUploads: 0,
      };
    }
  }
}
