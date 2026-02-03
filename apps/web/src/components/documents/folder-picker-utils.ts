/**
 * Utilities for folder picker (ISO Documents flow).
 * Used to filter tree to Documents (ISO_documents) folder only.
 */

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  physicalLocation: string | null;
  children: FolderNode[];
}

const ISO_DOCUMENTS_SECTION = "iso_documents";

/**
 * Find the ISO_documents node in tree (case-insensitive path/name).
 * Returns the node or null if not found.
 */
export function findDocumentsFolderNode(
  folders: FolderNode[]
): FolderNode | null {
  for (const node of folders) {
    const pathLower = (node.path ?? "").toLowerCase();
    const nameLower = (node.name ?? "").toLowerCase();
    const pathEndsWithSection =
      pathLower.endsWith(`/${ISO_DOCUMENTS_SECTION}`) ||
      pathLower === ISO_DOCUMENTS_SECTION;
    const nameMatches = nameLower === ISO_DOCUMENTS_SECTION;
    if (pathEndsWithSection || nameMatches) {
      return { ...node, children: node.children ?? [] };
    }
    if (node.children?.length) {
      const found = findDocumentsFolderNode(node.children);
      if (found) return found;
    }
  }
  return null;
}
