import { findDocumentsFolderNode } from "../folder-picker-utils";
import type { FolderNode } from "../folder-picker-utils";

describe("findDocumentsFolderNode", () => {
  it("returns ISO_documents node when at root", () => {
    const tree: FolderNode[] = [
      {
        id: "1",
        name: "ISO_documents",
        path: "DEPT/ISO_documents",
        physicalLocation: null,
        children: [],
      },
    ];
    const result = findDocumentsFolderNode(tree);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("1");
    expect(result?.path).toBe("DEPT/ISO_documents");
  });

  it("returns ISO_documents node when nested under department root", () => {
    const tree: FolderNode[] = [
      {
        id: "root",
        name: "Dept",
        path: "DEPT",
        physicalLocation: null,
        children: [
          {
            id: "kpi",
            name: "KPI",
            path: "DEPT/KPI",
            physicalLocation: null,
            children: [],
          },
          {
            id: "docs",
            name: "ISO_documents",
            path: "DEPT/ISO_documents",
            physicalLocation: null,
            children: [],
          },
        ],
      },
    ];
    const result = findDocumentsFolderNode(tree);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("docs");
    expect(result?.path).toBe("DEPT/ISO_documents");
  });

  it("matches case-insensitively (path)", () => {
    const tree: FolderNode[] = [
      {
        id: "1",
        name: "iso_documents",
        path: "DEPT/iso_documents",
        physicalLocation: null,
        children: [],
      },
    ];
    const result = findDocumentsFolderNode(tree);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("1");
  });

  it("returns null when no ISO_documents node", () => {
    const tree: FolderNode[] = [
      {
        id: "root",
        name: "Dept",
        path: "DEPT",
        physicalLocation: null,
        children: [
          {
            id: "kpi",
            name: "KPI",
            path: "DEPT/KPI",
            physicalLocation: null,
            children: [],
          },
        ],
      },
    ];
    const result = findDocumentsFolderNode(tree);
    expect(result).toBeNull();
  });

  it("returns null for empty tree", () => {
    expect(findDocumentsFolderNode([])).toBeNull();
  });
});
