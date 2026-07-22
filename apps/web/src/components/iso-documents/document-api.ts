import { api } from "@/lib/api";
import type { Document } from "@/lib/types/document.types";
import { ISO_LIMIT } from "./use-iso-documents";

export interface PaginatedDocuments {
  data: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchDocumentsParams {
  levelGroup?: "13" | "4";
  level?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

export function buildDocumentsUrl(params: {
  levelGroup?: "13" | "4";
  level?: string;
  departmentId?: string;
  page: number;
  limit: number;
}): string {
  const q = new URLSearchParams();
  q.append("status", "ACTIVE");
  q.append("page", params.page.toString());
  q.append("limit", params.limit.toString());
  if (params.departmentId) q.append("departmentId", params.departmentId);
  if (params.levelGroup) q.append("levelGroup", params.levelGroup);
  if (params.level) q.append("level", params.level);
  return `/storage/documents?${q.toString()}`;
}

export async function fetchDocuments(
  params: FetchDocumentsParams
): Promise<PaginatedDocuments> {
  return api.get<PaginatedDocuments>(
    buildDocumentsUrl({
      ...params,
      page: params.page ?? 1,
      limit: params.limit ?? ISO_LIMIT,
    })
  );
}
