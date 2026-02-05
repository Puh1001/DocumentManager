"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { documentApi, RenameDocumentDto } from "@/lib/api";

// Helper to get file extension
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.substring(lastDot).toLowerCase();
}

interface RenameDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentName: string;
  currentFileName: string;
  onRenamed?: () => void;
}

export function RenameDocumentDialog({
  open,
  onOpenChange,
  documentId,
  currentName,
  currentFileName,
  onRenamed,
}: RenameDocumentDialogProps) {
  const t = useTranslations("documents.editMetadata");
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setName(currentName);
      // Auto-generate fileName from currentName + extension
      const ext = getExtension(currentFileName);
      setFileName(currentName + ext);
    }
  }, [open, currentName, currentFileName]);

  // Auto-update fileName when name changes
  useEffect(() => {
    if (open && name) {
      const ext = getExtension(currentFileName);
      setFileName(name.trim() + ext);
    }
  }, [name, open, currentFileName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Document name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!fileName.trim()) {
      toast({
        title: "Error",
        description: "Filename cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Auto-generate fileName from name + extension
    const originalExt = getExtension(currentFileName);
    const autoFileName = name.trim() + originalExt;

    setSubmitting(true);
    try {
      const data: RenameDocumentDto = {
        name: name.trim(),
        fileName: autoFileName,
      };

      await documentApi.rename(documentId, data);

      toast({
        title: "Success",
        description: "Document renamed successfully",
      });

      onRenamed?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const apiError = error as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      toast({
        title: "Error",
        description:
          apiError.response?.data?.message ||
          apiError.message ||
          "Failed to rename document",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
          <DialogDescription>
            Update the document name. The filename will be automatically updated
            with the same extension.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Document Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter document name"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Filename will be automatically set to: {name.trim() || "..."}
              {getExtension(currentFileName)}
            </p>
            <p className="text-xs text-muted-foreground italic">
              {t("nameTitleRuleHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
