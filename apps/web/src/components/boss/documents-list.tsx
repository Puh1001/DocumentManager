"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ArrowLeft, FileText, Folder } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";
import { formatFileSize, formatDate, getFileIcon } from "@/lib/utils";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <Card className="p-6">
          <div className="text-center text-destructive">
            <p className="font-semibold">{t("error.loadDocumentsFailed")}</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("actions.back")}
      </Button>

      {folders.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">{t("empty.noFolder")}</p>
            <p className="text-sm mt-1">
              {t("empty.noFolderDescription", { department: departmentName })}
            </p>
          </div>
        </Card>
      ) : documents.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">{t("empty.noDocuments")}</p>
            <p className="text-sm mt-1">{t("empty.noDocumentsDescription")}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary active:scale-[0.98]"
              onClick={() => onSelectDocument(doc.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{getFileIcon(doc.fileType)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {doc.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {doc.fileName}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{doc.fileType.toUpperCase()}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
