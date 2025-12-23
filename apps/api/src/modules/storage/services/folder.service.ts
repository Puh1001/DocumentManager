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

@Injectable()
export class FolderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smbService: SmbService
  ) {}

  async findAll(parentId?: string | null) {
    return (this.prisma as PrismaClientLike).folder.findMany({
      where: {
        parentId: parentId || null,
        deletedAt: null, // Only active folders
      },
      include: {
        _count: {
          select: {
            children: true,
            documents: true,
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

  async getTree() {
    // Get all active folders
    const folders = await (this.prisma as PrismaClientLike).folder.findMany({
      where: { deletedAt: null }, // Only active folders
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
  }

  async count(): Promise<number> {
    return (this.prisma as PrismaClientLike).folder.count({
      where: { deletedAt: null }, // Only active folders
    });
  }
}
