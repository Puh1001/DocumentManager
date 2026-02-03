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
  const t = useTranslations("documents.editMetadata");
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [preparerId, setPreparerId] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [approverId, setApproverId] = useState<string | null>(null);
  const [approvalDate, setApprovalDate] = useState<Date | null>(null);
  const [receiptDate, setReceiptDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsersLoading(true);
    userApi
      .getAll({ limit: 300, isActive: true })
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
      setPreparerId(doc.preparer?.id ?? null);
      setReviewerId(doc.reviewer?.id ?? null);
      setApproverId(doc.approver?.id ?? null);
      setApprovalDate(parseDate(doc.approvalDate));
      setReceiptDate(parseDate(doc.receiptDate));
    }
  }, [open, doc]);

  const handleSave = async () => {
    if (!doc) return;
    const nextName = name.trim();
    const currentName = (doc.name ?? "").trim();
    if (!nextName) {
      toast({
        title: t("errorTitle"),
        description: t("nameRequired"),
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
      const payload = {
        levelId: levelId || undefined,
        preparerId: preparerId ?? undefined,
        reviewerId: reviewerId ?? undefined,
        approverId: approverId ?? undefined,
        approvalDate: approvalDate ? approvalDate.toISOString() : null,
        receiptDate: receiptDate ? receiptDate.toISOString() : null,
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
        title: t("errorTitle"),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { name: name?.trim() || doc.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="doc-name" className="text-sm font-medium">
              {t("nameLabel")}
            </Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              {t("fileNameHint", { fileName: `${name.trim() || "..."}${ext}` })}
            </p>
          </div>
          <LevelSelector
            value={levelId}
            onChange={(id) => setLevelId(id)}
            required={false}
            className="col-span-1"
          />
          <UserPicker
            label={t("preparer")}
            value={preparerId}
            onChange={setPreparerId}
            placeholder={t("none")}
            users={users}
            usersLoading={usersLoading}
          />
          <UserPicker
            label={t("reviewer")}
            value={reviewerId}
            onChange={setReviewerId}
            placeholder={t("none")}
            users={users}
            usersLoading={usersLoading}
          />
          <UserPicker
            label={t("approver")}
            value={approverId}
            onChange={setApproverId}
            placeholder={t("none")}
            users={users}
            usersLoading={usersLoading}
          />
          <DatePickerField
            label={t("approvalDate")}
            value={approvalDate}
            onChange={setApprovalDate}
          />
          <DatePickerField
            label={t("receiptDate")}
            value={receiptDate}
            onChange={setReceiptDate}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
