import { Injectable } from "@nestjs/common";
import { DocumentService } from "./document.service";
import { FolderService } from "./folder.service";
import { UsersService } from "@/modules/users/users.service";
import { PrismaService } from "@/common/prisma/prisma.service";

export interface StatsResponse {
  totalDocuments: number;
  totalFolders: number;
  totalUsers: number;
  recentUploads: number;
}

export interface DepartmentStatsItem {
  id: string;
  name: string;
  code: string;
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  total: number;
}

export type DepartmentStatsResponse = DepartmentStatsItem[];

@Injectable()
export class StatsService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly folderService: FolderService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService
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

  async getDepartmentStats(userId: string, userRoles: string[]): Promise<DepartmentStatsResponse> {
    try {
      // Admin & DCC see all departments; others see only their own
      const canSeeAll = userRoles.some((r) => ["admin", "dcc", "boss"].includes(r));

      // Get levels for code lookup
      const levels = await this.prisma.documentLevel.findMany({
        select: { id: true, code: true },
      });
      const levelMap: Record<string, string> = {};
      for (const l of levels) {
        levelMap[l.id] = l.code;
      }

      // Resolve accessible departments
      let accessibleDeptIds: string[] | undefined;
      if (!canSeeAll) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            departments: { select: { departmentId: true } },
          },
        });
        accessibleDeptIds = user?.departments.map((d) => d.departmentId) ?? [];
        if (accessibleDeptIds.length === 0) return [];
      }

      // Get departments
      const deptFilter = accessibleDeptIds ? { id: { in: accessibleDeptIds } } : {};
      const departments = await this.prisma.department.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { code: "asc" },
        where: deptFilter,
      });

      // Count ACTIVE docs per department + level
      const status = "ACTIVE";
      const raw: Array<{ department_id: string; level_id: string; count: number }> = await this.prisma.$queryRaw`
        SELECT f."department_id", d."level_id", COUNT(d.id)::int AS "count"
        FROM "documents" d
        JOIN "folders" f ON f.id = d."folder_id"
        WHERE d.status = CAST(${status} AS "DocumentStatus")
          AND d."level_id" IS NOT NULL
          AND f."department_id" IS NOT NULL
          AND f.path LIKE '%/ISO_documents%'
        GROUP BY f."department_id", d."level_id"
        ORDER BY f."department_id"
      `;

      // Aggregate into per-department stats
      const deptMap = new Map<string, DepartmentStatsItem>();
      for (const dept of departments) {
        deptMap.set(dept.id, {
          id: dept.id,
          name: dept.name ?? dept.code,
          code: dept.code,
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0,
          total: 0,
        });
      }

      for (const row of raw) {
        const item = deptMap.get(row.department_id);
        if (!item) continue;
        const code = levelMap[row.level_id] ?? "";
        const count = Number(row.count);
        if (code === "LEVEL1") item.level1 += count;
        else if (code === "LEVEL2") item.level2 += count;
        else if (code === "LEVEL3") item.level3 += count;
        else if (code === "LEVEL4") item.level4 += count;
        item.total += count;
      }

      // Filter out zero-doc departments and sort by total desc
      return Array.from(deptMap.values())
        .filter((d) => d.total > 0)
        .sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error("Error in getDepartmentStats():", error);
      return [];
    }
  }
}
