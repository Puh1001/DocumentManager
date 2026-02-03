"use client";

import { useState, useEffect } from "react";
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
import { kpiAttachmentApi, RenameDocumentDto } from "@/lib/api";

// Helper to get file extension
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.substring(lastDot).toLowerCase();
}

// Helper to get filename without extension
function getBasename(filename: string, ext: string): string {
  if (!ext) return filename;
  return filename.substring(0, filename.length - ext.length);
}

interface KpiAttachmentRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachmentId: string;
  currentFileName: string;
  onRenamed?: () => void;
}

export function KpiAttachmentRenameDialog({
  open,
  onOpenChange,
  attachmentId,
  currentFileName,
  onRenamed,
}: KpiAttachmentRenameDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      // Extract name from filename (without extension)
      const ext = getExtension(currentFileName);
      const nameWithoutExt = getBasename(currentFileName, ext);
      setName(nameWithoutExt);
    }
  }, [open, currentFileName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Attachment name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Auto-generate fileName from name + extension (.pdf for KPI attachments)
    const ext = getExtension(currentFileName);
    const autoFileName = name.trim() + ext;

    setSubmitting(true);
    try {
      const data: RenameDocumentDto = {
        name: name.trim(),
        fileName: autoFileName,
      };

      await kpiAttachmentApi.renameAttachment(attachmentId, data);

      toast({
        title: "Success",
        description: "Attachment renamed successfully",
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
          "Failed to rename attachment",
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
          <DialogTitle>Rename KPI Attachment</DialogTitle>
          <DialogDescription>
            Update the attachment name. The filename will be automatically
            updated with the same extension.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Attachment Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter attachment name"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Filename will be automatically set to: {name.trim() || "..."}
              {getExtension(currentFileName)}
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
