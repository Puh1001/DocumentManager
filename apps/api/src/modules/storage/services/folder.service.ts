import { Injectable } from "@nestjs/common";
import { PrismaService, Prisma } from "@/common/prisma/prisma.service";
import { SmbService } from "./smb.service";
import { CreateFolderDto } from "../dto/create-folder.dto";
import { UpdateFolderDto } from "../dto/update-folder.dto";
import { PrismaClientLike } from "@/common/types/prisma.types";
import { CustomException } from "@/common/errors/custom-exception";
import { ErrorCodes } from "@/common/errors/error-codes";

// Export FolderTreeNode for use in controllers
export interface FolderTreeNode {
  id: string;
  name: string;
  path: string;
  physicalLocation: string | null;
  documentCount: number;
  children: FolderTreeNode[];
}

// Extended interface for tree with documents
export interface FolderTreeNodeWithDocuments extends FolderTreeNode {
  documents?: Array<{
    id: string;
    name: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    updatedAt: Date;
  }>;
  children: FolderTreeNodeWithDocuments[];
}

@Injectable()
export class FolderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService
  ) {}

  async findAll(parentId?: string | null, departmentId?: string) {
    const where: Prisma.FolderWhereInput = {
      deletedAt: null, // Only active folders
    };

    if (parentId !== undefined) {
      where.parentId = parentId || null;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    return (this.prisma as PrismaClientLike).folder.findMany({
      where,
      include: {
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { id },
      include: {
        parent: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        children: {
          where: { deletedAt: null }, // Only active children
          orderBy: { name: "asc" },
        },
        documents: {
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
        },
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!folder || folder.deletedAt) {
      throw CustomException.notFound(
        ErrorCodes.FOLDER.NOT_FOUND,
        "Folder not found"
      );
    }

    return folder;
  }

  async create(dto: CreateFolderDto) {
    let folderPath = dto.name;

    // If has parent, prepend parent path
    if (dto.parentId) {
      const parent = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.deletedAt) {
        throw CustomException.notFound(
          ErrorCodes.FOLDER.PARENT_NOT_FOUND,
          "Parent folder not found or deleted"
        );
      }
      if (parent) {
        folderPath = `${parent.path}/${dto.name}`;
      }
    }

    // Create physical folder
    await this.smbService.createDirectory(folderPath);

    // Create in database
    return (this.prisma as PrismaClientLike).folder.create({
      data: {
        name: dto.name,
        path: folderPath,
        parentId: dto.parentId,
        physicalLocation: dto.physicalLocation,
        departmentId: dto.departmentId,
      },
    });
  }

  async update(id: string, dto: UpdateFolderDto) {
    const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { id },
    });
    if (!folder || folder.deletedAt) {
      throw CustomException.notFound(
        ErrorCodes.FOLDER.NOT_FOUND,
        "Folder not found or deleted"
      );
    }

    const data: Prisma.FolderUpdateInput = {};

    if (dto.name) {
      data.name = dto.name;
      // Update path
      const pathParts = folder.path.split("/");
      pathParts[pathParts.length - 1] = dto.name;
      const newPath = pathParts.join("/");

      // Rename physical folder
      await this.smbService.rename(folder.path, newPath);
      data.path = newPath;
    }

    if (dto.physicalLocation !== undefined) {
      data.physicalLocation = dto.physicalLocation;
    }

    if (dto.departmentId !== undefined) {
      // Use Prisma's connect/disconnect pattern for relations
      if (dto.departmentId === null || dto.departmentId === "") {
        data.department = { disconnect: true };
      } else {
        data.department = { connect: { id: dto.departmentId } };
      }
    }

    return (this.prisma as PrismaClientLike).folder.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { id },
      include: { children: true, documents: true },
    });

    if (!folder) {
      throw CustomException.notFound(
        ErrorCodes.FOLDER.NOT_FOUND,
        "Folder not found"
      );
    }

    const hasActiveDocs = folder.documents.some(
      (doc) => doc.status !== "DELETED"
    );

    if (folder.children.length > 0 || hasActiveDocs) {
      throw new Error("Cannot delete non-empty folder");
    }

    // Delete physical folder
    await this.smbService.deleteDirectory(folder.path);

    // Delete from database
    return (this.prisma as PrismaClientLike).folder.delete({ where: { id } });
  }

  async getTree(departmentId?: string) {
    try {
      // Build where clause
      const where: Prisma.FolderWhereInput = {
        deletedAt: null, // Only active folders
      };

      if (departmentId) {
        where.departmentId = departmentId;
      }

      // Get all active folders
      const folders = await (this.prisma as PrismaClientLike).folder.findMany({
        where,
        orderBy: { path: "asc" },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      });

      // Build tree structure
      const buildTree = (parentId: string | null = null): FolderTreeNode[] => {
        return folders
          .filter((f: (typeof folders)[0]) => f.parentId === parentId)
          .map((f: (typeof folders)[0]) => ({
            id: f.id,
            name: f.name,
            path: f.path,
            physicalLocation: f.physicalLocation,
            documentCount: f._count.documents,
            children: buildTree(f.id),
          }));
      };

      return buildTree();
    } catch (error) {
      // Log error for debugging
      console.error("Error in getTree():", error);

      // Re-throw as CustomException for proper error handling
      throw CustomException.internalServerError(
        ErrorCodes.FOLDER.TREE_FETCH_FAILED,
        "Failed to fetch folder tree",
        error
      );
    }
  }

  async getTreeWithDocuments(departmentId?: string) {
    try {
      // Build where clause
      const where: Prisma.FolderWhereInput = {
        deletedAt: null, // Only active folders
      };

      if (departmentId) {
        where.departmentId = departmentId;
      }

      // Get all active folders with documents
      const folders = await (this.prisma as PrismaClientLike).folder.findMany({
        where,
        orderBy: { path: "asc" },
        include: {
          _count: {
            select: { documents: true },
          },
          documents: {
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              fileName: true,
              fileType: true,
              fileSize: true,
              updatedAt: true,
            },
          },
        },
      });

      // Build tree structure with documents
      const buildTree = (
        parentId: string | null = null
      ): FolderTreeNodeWithDocuments[] => {
        return folders
          .filter((f: (typeof folders)[0]) => f.parentId === parentId)
          .map((f: (typeof folders)[0]) => ({
            id: f.id,
            name: f.name,
            path: f.path,
            physicalLocation: f.physicalLocation,
            documentCount: f._count.documents,
            documents: f.documents.map((doc) => ({
              id: doc.id,
              name: doc.name,
              fileName: doc.fileName,
              fileType: doc.fileType,
              fileSize: doc.fileSize,
              updatedAt: doc.updatedAt,
            })),
            children: buildTree(f.id),
          }));
      };

      return buildTree();
    } catch (error) {
      // Log error for debugging
      console.error("Error in getTreeWithDocuments():", error);

      // Re-throw as CustomException for proper error handling
      throw CustomException.internalServerError(
        ErrorCodes.FOLDER.TREE_FETCH_FAILED,
        "Failed to fetch folder tree with documents",
        error
      );
    }
  }

  async count(): Promise<number> {
    return (this.prisma as PrismaClientLike).folder.count({
      where: { deletedAt: null }, // Only active folders
    });
  }

  /**
   * Ensure department folder structure exists (create if not exists, use if exists)
   * Structure: {dept.code}/KPI/current, {dept.code}/KPI/version,
   *            {dept.code}/Documents/current, {dept.code}/Documents/version,
   *            {dept.code}/Maintenance/current, {dept.code}/Maintenance/version,
   *            {dept.code}/Deleted files
   * 
   * @param departmentId Department ID
   * @returns Object with folder IDs for each type
   */
  async ensureDepartmentFolderStructure(departmentId: string): Promise<{
    departmentRoot: string;
    kpiCurrent: string;
    kpiVersion: string;
    documentsCurrent: string;
    documentsVersion: string;
    maintenanceCurrent: string;
    maintenanceVersion: string;
    deletedFiles: string;
  }> {
    // Get department info
    const department = await (this.prisma as PrismaClientLike).department.findUnique({
      where: { id: departmentId },
      select: { id: true, code: true, nameVi: true },
    });

    if (!department) {
      throw CustomException.notFound(
        ErrorCodes.DEPARTMENT.NOT_FOUND,
        "Department not found"
      );
    }

    const folderPath = department.code;

    // Step 1: Find or create department root folder
    let departmentRoot = await (this.prisma as PrismaClientLike).folder.findUnique({
      where: { path: folderPath },
    });

    if (!departmentRoot) {
      // Create physical folder on SMB
      await this.smbService.createDirectory(folderPath);

      try {
        departmentRoot = await (this.prisma as PrismaClientLike).folder.create({
          data: {
            name: department.nameVi || department.code,
            path: folderPath,
            parentId: null,
            departmentId: department.id,
          },
        });
      } catch (error: unknown) {
        // Handle race condition
        const isUniqueConstraintError =
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002";

        if (isUniqueConstraintError) {
          departmentRoot = await (this.prisma as PrismaClientLike).folder.findUnique({
            where: { path: folderPath },
          });
        } else {
          throw error;
        }
      }
    } else {
      // Update if needed
      if (!departmentRoot.departmentId || departmentRoot.deletedAt) {
        await (this.prisma as PrismaClientLike).folder.update({
          where: { id: departmentRoot.id },
          data: {
            departmentId: department.id,
            deletedAt: null,
          },
        });
        departmentRoot = await (this.prisma as PrismaClientLike).folder.findUnique({
          where: { path: folderPath },
        });
      }
    }

    if (!departmentRoot) {
      throw CustomException.notFound(
        ErrorCodes.FOLDER.NOT_FOUND,
        `Failed to find or create department folder: ${folderPath}`
      );
    }

    // Step 2: Find or create subfolders (KPI, Documents, Maintenance, Deleted files)
    const subfolders = ["KPI", "Documents", "Maintenance", "Deleted files"];
    const subfolderMap = new Map<string, string>();

    for (const sub of subfolders) {
      const subfolderPath = `${folderPath}/${sub}`;
      let subfolder = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { path: subfolderPath },
      });

      if (!subfolder) {
        // Create physical folder on SMB
        await this.smbService.createDirectory(subfolderPath);

        try {
          subfolder = await (this.prisma as PrismaClientLike).folder.create({
            data: {
              name: sub,
              path: subfolderPath,
              parentId: departmentRoot.id,
              departmentId: department.id,
            },
          });
        } catch (error: unknown) {
          const isUniqueConstraintError =
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002";

          if (isUniqueConstraintError) {
            subfolder = await (this.prisma as PrismaClientLike).folder.findUnique({
              where: { path: subfolderPath },
            });
          } else {
            throw error;
          }
        }
      } else {
        // Update if needed
        if (subfolder.deletedAt || subfolder.parentId !== departmentRoot.id) {
          await (this.prisma as PrismaClientLike).folder.update({
            where: { id: subfolder.id },
            data: {
              deletedAt: null,
              parentId: departmentRoot.id,
              departmentId: department.id,
            },
          });
          subfolder = await (this.prisma as PrismaClientLike).folder.findUnique({
            where: { path: subfolderPath },
          });
        }
      }

      if (subfolder) {
        subfolderMap.set(sub, subfolder.id);
      }
    }

    // Step 3: For KPI, Documents, Maintenance: find or create current/ and version/ subfolders
    const folderTypes = ["KPI", "Documents", "Maintenance"];
    const result: any = {
      departmentRoot: departmentRoot.id,
      deletedFiles: subfolderMap.get("Deleted files") || "",
    };

    for (const type of folderTypes) {
      const typeFolderId = subfolderMap.get(type);
      if (!typeFolderId) continue;

      const typeFolder = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { id: typeFolderId },
      });
      if (!typeFolder) continue;

      // Create current/ subfolder
      const currentPath = `${typeFolder.path}/current`;
      let currentFolder = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { path: currentPath },
      });

      if (!currentFolder) {
        await this.smbService.createDirectory(currentPath);
        try {
          currentFolder = await (this.prisma as PrismaClientLike).folder.create({
            data: {
              name: "current",
              path: currentPath,
              parentId: typeFolder.id,
              departmentId: department.id,
            },
          });
        } catch (error: unknown) {
          const isUniqueConstraintError =
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002";

          if (isUniqueConstraintError) {
            currentFolder = await (this.prisma as PrismaClientLike).folder.findUnique({
              where: { path: currentPath },
            });
          } else {
            throw error;
          }
        }
      }

      // Create version/ subfolder
      const versionPath = `${typeFolder.path}/version`;
      let versionFolder = await (this.prisma as PrismaClientLike).folder.findUnique({
        where: { path: versionPath },
      });

      if (!versionFolder) {
        await this.smbService.createDirectory(versionPath);
        try {
          versionFolder = await (this.prisma as PrismaClientLike).folder.create({
            data: {
              name: "version",
              path: versionPath,
              parentId: typeFolder.id,
              departmentId: department.id,
            },
          });
        } catch (error: unknown) {
          const isUniqueConstraintError =
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002";

          if (isUniqueConstraintError) {
            versionFolder = await (this.prisma as PrismaClientLike).folder.findUnique({
              where: { path: versionPath },
            });
          } else {
            throw error;
          }
        }
      }

      // Set result based on type
      if (type === "KPI") {
        result.kpiCurrent = currentFolder?.id || "";
        result.kpiVersion = versionFolder?.id || "";
      } else if (type === "Documents") {
        result.documentsCurrent = currentFolder?.id || "";
        result.documentsVersion = versionFolder?.id || "";
      } else if (type === "Maintenance") {
        result.maintenanceCurrent = currentFolder?.id || "";
        result.maintenanceVersion = versionFolder?.id || "";
      }
    }

    return result;
  }
}
