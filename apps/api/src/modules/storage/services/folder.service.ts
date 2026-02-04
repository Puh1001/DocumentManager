import { Injectable, Logger } from "@nestjs/common";
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
  private readonly logger = new Logger(FolderService.name);

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

  async findById(id: string, documentStatus?: string) {
    const docStatus: Prisma.EnumDocumentStatusFilter["equals"] | undefined =
      documentStatus === "ARCHIVED" ||
      documentStatus === "DELETED" ||
      documentStatus === "ACTIVE"
        ? (documentStatus as Prisma.EnumDocumentStatusFilter["equals"])
        : undefined;
    const documentsWhere: Prisma.DocumentWhereInput =
      docStatus !== undefined ? { status: docStatus } : {};

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
          where: documentsWhere,
          orderBy: { name: "asc" },
          include: {
            _count: { select: { versions: true } },
          },
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

  /**
   * Determine whether a folder should be treated as internal/hidden
   * for non-privileged users.
   *
   * We use multiple signals to be robust against legacy data:
   * - Explicit flags: isInternal / internalType
   * - Name-based fallback (case-insensitive): versions, version, deleted files, delete files
   */
  private isInternalFolderForTree(folder: {
    name: string;
    isInternal?: boolean | null;
    internalType?: string | null;
  }): boolean {
    if (folder.isInternal) {
      return true;
    }

    if (
      folder.internalType === "VERSIONS" ||
      folder.internalType === "DELETE_FILES"
    ) {
      return true;
    }

    const normalizedName = folder.name.trim().toLowerCase();
    if (
      normalizedName === "versions" ||
      normalizedName === "version" ||
      normalizedName === "deleted files" ||
      normalizedName === "delete files"
    ) {
      return true;
    }

    return false;
  }

  async getTree(departmentId?: string, includeInternal: boolean = false) {
    try {
      // Ensure department folder structure exists when loading tree for a department (Option A)
      if (departmentId) {
        try {
          await this.ensureDepartmentFolderStructure(departmentId);
        } catch (ensureError) {
          this.logger.warn(
            "Failed to ensure department folder structure",
            ensureError instanceof Error ? ensureError.stack : ensureError
          );
          // Continue to build tree from existing DB state so UI does not break
        }
      }

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
          .filter((f: (typeof folders)[0]) => {
            if (f.parentId !== parentId) {
              return false;
            }
            // Hide internal folders (versions, Deleted files) for non-privileged users
            if (!includeInternal) {
              if (this.isInternalFolderForTree(f)) {
                return false;
              }
            }
            return true;
          })
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
      this.logger.error(
        "Error in getTree()",
        error instanceof Error ? error.stack : error
      );
      throw CustomException.internalServerError(
        ErrorCodes.FOLDER.TREE_FETCH_FAILED,
        "Failed to fetch folder tree",
        error
      );
    }
  }

  async getTreeWithDocuments(
    departmentId?: string,
    includeInternal: boolean = false
  ) {
    try {
      if (departmentId) {
        try {
          await this.ensureDepartmentFolderStructure(departmentId);
        } catch (ensureError) {
          this.logger.warn(
            "Failed to ensure department folder structure",
            ensureError instanceof Error ? ensureError.stack : ensureError
          );
        }
      }

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
          .filter((f: (typeof folders)[0]) => {
            if (f.parentId !== parentId) {
              return false;
            }
            // Hide internal folders (versions, Deleted files) for non-privileged users
            if (!includeInternal) {
              if (this.isInternalFolderForTree(f)) {
                return false;
              }
            }
            return true;
          })
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
      this.logger.error(
        "Error in getTreeWithDocuments()",
        error instanceof Error ? error.stack : error
      );
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
   *
   * New canonical layout per department:
   *   {dept.code}/KPI/
   *     - Current files live directly under this folder
   *     - versions/{documentId}/vNNN_... for historical versions
   *   {dept.code}/Documents/
   *     - Same pattern as KPI
   *   {dept.code}/Maintenance/
   *     - Same pattern as KPI
   *   {dept.code}/Deleted files/
   *     - Admin-only area for soft-deleted documents
   *
   * This replaces the older "{Section}/current" + "{Section}/version" layout.
   *
   * @param departmentId Department ID
   * @returns Object with folder IDs for section roots and versions roots
   */
  async ensureDepartmentFolderStructure(departmentId: string): Promise<{
    departmentRoot: string;
    kpiSectionRoot: string;
    kpiVersionsRoot: string;
    documentsSectionRoot: string;
    documentsVersionsRoot: string;
    maintenanceSectionRoot: string;
    maintenanceVersionsRoot: string;
    deletedFiles: string;
  }> {
    // Get department info
    const department = await (
      this.prisma as PrismaClientLike
    ).department.findUnique({
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
    let departmentRoot = await (
      this.prisma as PrismaClientLike
    ).folder.findUnique({
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
          departmentRoot = await (
            this.prisma as PrismaClientLike
          ).folder.findUnique({
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
        departmentRoot = await (
          this.prisma as PrismaClientLike
        ).folder.findUnique({
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

    // Step 2: Find or create section subfolders (KPI, ISO_documents, Maintenance, Delete_files)
    const subfolders = ["KPI", "ISO_documents", "Maintenance", "Delete_files"];
    const subfolderMap = new Map<string, string>();

    for (const sub of subfolders) {
      const subfolderPath = `${folderPath}/${sub}`;
      let subfolder = await (this.prisma as PrismaClientLike).folder.findUnique(
        {
          where: { path: subfolderPath },
        }
      );

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
              // Delete_files is an internal/admin-only folder
              ...(sub === "Delete_files" && {
                isInternal: true,
                internalType: "DELETE_FILES",
              }),
            },
          });
        } catch (error: unknown) {
          const isUniqueConstraintError =
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002";

          if (isUniqueConstraintError) {
            subfolder = await (
              this.prisma as PrismaClientLike
            ).folder.findUnique({
              where: { path: subfolderPath },
            });
          } else {
            throw error;
          }
        }
      } else {
        // Update if needed (e.g. restored from sync with null departmentId, or wrong parent)
        const needsUpdate =
          subfolder.deletedAt ||
          subfolder.parentId !== departmentRoot.id ||
          subfolder.departmentId !== department.id;
        if (needsUpdate) {
          await (this.prisma as PrismaClientLike).folder.update({
            where: { id: subfolder.id },
            data: {
              deletedAt: null,
              parentId: departmentRoot.id,
              departmentId: department.id,
              ...(sub === "Delete_files" && {
                isInternal: true,
                internalType: "DELETE_FILES",
              }),
            },
          });
          subfolder = await (this.prisma as PrismaClientLike).folder.findUnique(
            {
              where: { path: subfolderPath },
            }
          );
        }
      }

      if (subfolder) {
        subfolderMap.set(sub, subfolder.id);
      }
    }

    // Step 3: For KPI, ISO_documents, Maintenance: find or create versions/ subfolders
    const folderTypes = ["KPI", "ISO_documents", "Maintenance"] as const;
    const result: {
      departmentRoot: string;
      kpiSectionRoot: string;
      kpiVersionsRoot: string;
      documentsSectionRoot: string;
      documentsVersionsRoot: string;
      maintenanceSectionRoot: string;
      maintenanceVersionsRoot: string;
      deletedFiles: string;
    } = {
      departmentRoot: departmentRoot.id,
      kpiSectionRoot: "",
      kpiVersionsRoot: "",
      documentsSectionRoot: "",
      documentsVersionsRoot: "",
      maintenanceSectionRoot: "",
      maintenanceVersionsRoot: "",
      deletedFiles: subfolderMap.get("Delete_files") || "",
    };

    for (const type of folderTypes) {
      const typeFolderId = subfolderMap.get(type);
      if (!typeFolderId) continue;

      let typeFolder = await (
        this.prisma as PrismaClientLike
      ).folder.findUnique({
        where: { id: typeFolderId },
      });
      if (!typeFolder) continue;

      // Ensure section root is active and correctly linked to department
      if (typeFolder.deletedAt || typeFolder.parentId !== departmentRoot.id) {
        await (this.prisma as PrismaClientLike).folder.update({
          where: { id: typeFolder.id },
          data: {
            deletedAt: null,
            parentId: departmentRoot.id,
            departmentId: department.id,
          },
        });
        typeFolder = await (this.prisma as PrismaClientLike).folder.findUnique({
          where: { id: typeFolderId },
        });
        if (!typeFolder) {
          continue;
        }
      }

      // Create versions/ subfolder under section root
      const versionsPath = `${typeFolder.path}/versions`;
      let versionsFolder = await (
        this.prisma as PrismaClientLike
      ).folder.findUnique({
        where: { path: versionsPath },
      });

      if (!versionsFolder) {
        await this.smbService.createDirectory(versionsPath);
        try {
          versionsFolder = await (
            this.prisma as PrismaClientLike
          ).folder.create({
            data: {
              name: "versions",
              path: versionsPath,
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
            versionsFolder = await (
              this.prisma as PrismaClientLike
            ).folder.findUnique({
              where: { path: versionsPath },
            });
          } else {
            throw error;
          }
        }
      } else if (
        versionsFolder.deletedAt ||
        versionsFolder.parentId !== typeFolder.id
      ) {
        // Restore / re-parent existing versions folder if needed
        await (this.prisma as PrismaClientLike).folder.update({
          where: { id: versionsFolder.id },
          data: {
            deletedAt: null,
            parentId: typeFolder.id,
            departmentId: department.id,
          },
        });
        versionsFolder = await (
          this.prisma as PrismaClientLike
        ).folder.findUnique({
          where: { path: versionsPath },
        });
      }

      // Set result based on type
      if (type === "KPI") {
        result.kpiSectionRoot = typeFolder.id;
        result.kpiVersionsRoot = versionsFolder?.id || "";
      } else if (type === "ISO_documents") {
        result.documentsSectionRoot = typeFolder.id;
        result.documentsVersionsRoot = versionsFolder?.id || "";
      } else if (type === "Maintenance") {
        result.maintenanceSectionRoot = typeFolder.id;
        result.maintenanceVersionsRoot = versionsFolder?.id || "";
      }
    }

    return result;
  }
}
