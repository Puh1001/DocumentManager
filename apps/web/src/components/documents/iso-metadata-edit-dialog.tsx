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
import { documentApi, userApi, type User } from "@/lib/api";
import type { Document } from "@/lib/types/document.types";
import { REVISION_LABEL_OPTIONS } from "@iso-docs/shared";
import { LevelSelector } from "./level-selector";
import { UserPicker } from "./user-picker";
import { DatePickerField } from "./date-picker-field";

interface IsoMetadataEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onSaved?: () => void;
}

function parseDate(s: string | null | undefined): Date | null {
  if (s == null || s === "") return null;
  try {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.substring(lastDot).toLowerCase();
}

export function IsoMetadataEditDialog({
  open,
  onOpenChange,
  document: doc,
  onSaved,
}: IsoMetadataEditDialogProps) {
  const t = useTranslations("documents");
  const tEdit = (key: string, values?: Record<string, string | number>) =>
    t(`editMetadata.${key}`, values);
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [approverId, setApproverId] = useState<string | null>(null);
  const [approvalDate, setApprovalDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsersLoading(true);
    userApi
      .getForAssignees({ limit: 100, isActive: true })
      .then((res) => {
        setUsers(res.data ?? []);
      })
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [open]);

  useEffect(() => {
    if (open && doc) {
      setName(doc.name ?? "");
      setLevelId(doc.level?.id ?? "");
      setDocumentNo(doc.documentNo ?? "");
      setRevisionLabel(doc.revisionLabel ?? "A/0");
      setReviewerId(doc.reviewer?.id ?? null);
      setApproverId(doc.approver?.id ?? null);
      setApprovalDate(parseDate(doc.approvalDate));
    }
  }, [open, doc]);

  const handleSave = async () => {
    if (!doc) return;
    const nextName = name.trim();
    const nextDocumentNo = documentNo.trim();
    const currentName = (doc.name ?? "").trim();
    if (!nextName) {
      toast({
        title: t("errorTitle"),
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!nextDocumentNo) {
      toast({
        title: tEdit("errorTitle"),
        description: tEdit("documentNoRequired"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      // Rename first (fail fast on conflicts), then update metadata
      if (nextName !== currentName) {
        const ext = getExtension(doc.fileName ?? "");
        await documentApi.rename(doc.id, {
          name: nextName,
          fileName: `${nextName}${ext}`,
        });
      }
      // Preparer and receipt date are auto-assigned; do not send to avoid overwriting
      const payload = {
        levelId: levelId || undefined,
        documentNo: nextDocumentNo || null,
        revisionLabel: revisionLabel?.trim() || null,
        reviewerId: reviewerId ?? undefined,
        approverId: approverId ?? undefined,
        approvalDate: approvalDate ? approvalDate.toISOString() : null,
      };
      await documentApi.updateIsoMetadata(doc.id, payload);
      toast({
        title: t("successTitle"),
        description: t("successDescription"),
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast({
        title: tEdit("errorTitle"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!doc) return null;
  const ext = getExtension(doc.fileName ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] w-[min(28rem,calc(100vw-2rem))] overflow-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{tEdit("title")}</DialogTitle>
          <DialogDescription className="break-words">
            {tEdit("description", { name: name?.trim() || doc.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4 py-4">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="doc-name" className="text-sm font-medium">
              {tEdit("nameLabel")}
            </Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tEdit("namePlaceholder")}
              disabled={submitting}
              className="min-w-0"
            />
            <p className="text-xs text-muted-foreground break-words min-w-0">
              {tEdit("fileNameHint", {
                fileName: `${name.trim() || "..."}${ext}`,
              })}
            </p>
            <p className="text-xs text-muted-foreground break-words min-w-0 italic">
              {tEdit("nameTitleRuleHint")}
            </p>
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="doc-no" className="text-sm font-medium">
              {tEdit("documentNoLabel")}
            </Label>
            <Input
              id="doc-no"
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              placeholder={tEdit("documentNoPlaceholder")}
              disabled={submitting}
              className="min-w-0 uppercase"
            />
            <p className="text-xs text-muted-foreground">
              {tEdit("documentNoHint")}
            </p>
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="revision-label" className="text-sm font-medium">
              {tEdit("revisionLabelLabel")}
            </Label>
            <select
              id="revision-label"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[2.25rem]"
              value={revisionLabel}
              onChange={(e) => setRevisionLabel(e.target.value)}
              disabled={submitting}
            >
              {REVISION_LABEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {tEdit("revisionLabelHint")}
            </p>
          </div>
          <LevelSelector
            value={levelId}
            onChange={(id) => setLevelId(id)}
            required={false}
            className="col-span-1"
          />
          <UserPicker
            label={tEdit("reviewer")}
            value={reviewerId}
            onChange={setReviewerId}
            placeholder={tEdit("none")}
            users={users}
            usersLoading={usersLoading}
          />
          <UserPicker
            label={tEdit("approver")}
            value={approverId}
            onChange={setApproverId}
            placeholder={tEdit("none")}
            users={users}
            usersLoading={usersLoading}
          />
          <DatePickerField
            label={tEdit("approvalDate")}
            value={approvalDate}
            onChange={setApprovalDate}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {tEdit("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? tEdit("saving") : tEdit("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
