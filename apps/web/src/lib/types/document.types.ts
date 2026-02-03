/**
 * Document-related types for storage/documents list and detail.
 * Matches API response from GET /storage/documents and GET /storage/documents/:id.
 */

export interface DocumentLevel {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  nameVi?: string | null;
  nameZh?: string | null;
  /** Present in GET /storage/document-levels. */
  isActive?: boolean;
  /** Present in GET /storage/document-levels. */
  sortOrder?: number;
}

export function getDocumentLevelDisplayName(
  level: Pick<DocumentLevel, "name" | "nameEn" | "nameVi" | "nameZh">,
  locale: string
): string {
  if (locale === "vi" && level.nameVi) return level.nameVi;
  if (locale === "zh" && level.nameZh) return level.nameZh;
  if (locale === "en" && level.nameEn) return level.nameEn;
  return level.name;
}

export interface DocumentUser {
  id: string;
  username: string;
  fullName: string;
}

export interface DocumentFolder {
  id: string;
  name: string;
  path: string;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  updatedAt: string;
  folderId?: string;
  status?: string;
  deletionExpiresAt?: string | null;
  _count?: { versions: number };
  folder?: DocumentFolder | null;
  level?: DocumentLevel | null;
  preparer?: DocumentUser | null;
  reviewer?: DocumentUser | null;
  approver?: DocumentUser | null;
  approvalDate?: string | null;
  receiptDate?: string | null;
}
