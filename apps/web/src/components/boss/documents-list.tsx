"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { ArrowLeft, FileText, Folder } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";
import { getFileIcon, getShortName } from "@/lib/utils";

interface Folder {
  id: string;
  name: string;
  path: string;
  children: Folder[];
  documents?: Document[];
}

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  updatedAt: string;
}

interface DocumentsListProps {
  departmentId: string;
  departmentName: string;
  onSelectDocument: (documentId: string) => void;
  onBack: () => void;
}

// Recursively find all documents in a folder tree
function getAllDocuments(folders: Folder[]): Document[] {
  const documents: Document[] = [];

  function traverse(folderList: Folder[]) {
    for (const folder of folderList) {
      if (folder.documents) {
        documents.push(...folder.documents);
      }
      if (folder.children && folder.children.length > 0) {
        traverse(folder.children);
      }
    }
  }

  traverse(folders);
  return documents;
}

export function DocumentsList({
  departmentId,
  departmentName,
  onSelectDocument,
  onBack,
}: DocumentsListProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Use new endpoint with documents included
      const tree = await api.get<Folder[]>(
        `/storage/folders/tree/with-documents?departmentId=${departmentId}`
      );
      setFolders(tree || []);
    } catch (err) {
      console.error("Failed to load folders:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [departmentId, tCommon]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Get all documents from filtered folder tree (already filtered by departmentId)
  const documents = useMemo(() => {
    if (folders.length === 0) return [];
    return getAllDocuments(folders);
  }, [folders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500" />
          <div
            className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-2 border-transparent border-r-fuchsia-500/30 border-t-fuchsia-500"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center text-fuchsia-400 cyber-text-glow">
            <p className="font-cyber font-semibold text-lg">{t("error.loadDocumentsFailed")}</p>
            <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t("actions.back")}
      </button>

      {folders.length === 0 ? (
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center py-12">
            <Folder className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
            <p className="text-xl font-cyber font-semibold cyber-neon-cyan">{t("empty.noFolder")}</p>
            <p className="text-sm mt-2 text-cyan-400/60 font-cyber">
              {t("empty.noFolderDescription", { department: departmentName })}
            </p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
            <p className="text-xl font-cyber font-semibold cyber-neon-cyan">{t("empty.noDocuments")}</p>
            <p className="text-sm mt-2 text-cyan-400/60 font-cyber">{t("empty.noDocumentsDescription")}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, index) => (
            <div
              key={doc.id}
              className="w-full cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 p-4 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 hover:bg-cyan-500/5"
              onClick={() => onSelectDocument(doc.id)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex-shrink-0 text-2xl">{getFileIcon(doc.fileType)}</div>
              <h3 className="font-cyber font-bold text-base cyber-neon-cyan flex-1 break-words whitespace-normal">
                {doc.name}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
