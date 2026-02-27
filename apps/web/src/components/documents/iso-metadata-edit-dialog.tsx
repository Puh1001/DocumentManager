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
import { documentApi } from "@/lib/api";
import type { Document } from "@/lib/types/document.types";
import { REVISION_LABEL_OPTIONS } from "@iso-docs/shared";
import { LevelSelector } from "./level-selector";
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
  const [preparerName, setPreparerName] = useState<string>("");
  const [documentNo, setDocumentNo] = useState("");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [reviewerName, setReviewerName] = useState<string>("");
  const [approverName, setApproverName] = useState<string>("");
  const [approvalDate, setApprovalDate] = useState<Date | null>(null);
  const [receiptDate, setReceiptDate] = useState<Date | null>(null);
  const [storageLocation, setStorageLocation] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && doc) {
      setName(doc.name ?? "");
      setLevelId(doc.level?.id ?? "");
      setDocumentNo(doc.documentNo ?? "");
      setRevisionLabel(doc.revisionLabel ?? "A/0");
       // Prefer explicit preparerName override, fall back to related user fullName
      setPreparerName(doc.preparerName ?? doc.preparer?.fullName ?? "");
      // Use name from document if available, otherwise use fullName from user relation
      setReviewerName(doc.reviewerName ?? doc.reviewer?.fullName ?? "");
      setApproverName(doc.approverName ?? doc.approver?.fullName ?? "");
      setApprovalDate(parseDate(doc.approvalDate));
      setReceiptDate(parseDate(doc.receiptDate));
      setStorageLocation(doc.storageLocation ?? "");
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
      const payload = {
        levelId: levelId || undefined,
        documentNo: nextDocumentNo || null,
        revisionLabel: revisionLabel?.trim() || null,
        preparerName: preparerName.trim() || null,
        reviewerName: reviewerName.trim() || null,
        approverName: approverName.trim() || null,
        approvalDate: approvalDate ? approvalDate.toISOString() : null,
        receiptDate: receiptDate ? receiptDate.toISOString() : null,
        storageLocation: storageLocation.trim() || null,
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
          <div className="space-y-2 min-w-0">
            <Label htmlFor="preparer-name" className="text-sm font-medium">
              {tEdit("preparer")}
            </Label>
            <Input
              id="preparer-name"
              value={preparerName}
              onChange={(e) => setPreparerName(e.target.value)}
              placeholder={tEdit("preparerPlaceholder")}
              disabled={submitting}
              className="min-w-0"
            />
            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
              {tEdit("fullNameRequired")}
            </p>
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="reviewer-name" className="text-sm font-medium">
              {tEdit("reviewer")}
            </Label>
            <Input
              id="reviewer-name"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder={tEdit("reviewerPlaceholder")}
              disabled={submitting}
              className="min-w-0"
            />
            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
              {tEdit("fullNameRequired")}
            </p>
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="approver-name" className="text-sm font-medium">
              {tEdit("approver")}
            </Label>
            <Input
              id="approver-name"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder={tEdit("approverPlaceholder")}
              disabled={submitting}
              className="min-w-0"
            />
            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
              {tEdit("fullNameRequired")}
            </p>
          </div>
          <DatePickerField
            label={tEdit("approvalDate")}
            value={approvalDate}
            onChange={setApprovalDate}
          />
          <DatePickerField
            label={tEdit("receiptDate")}
            value={receiptDate}
            onChange={setReceiptDate}
          />
          <div className="space-y-2 min-w-0 col-span-2">
            <Label htmlFor="storage-location" className="text-sm font-medium">
              {tEdit("storageLocation")}
            </Label>
            <Input
              id="storage-location"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder={tEdit("storageLocationPlaceholder")}
              disabled={submitting}
              className="min-w-0"
            />
            <p className="text-xs text-muted-foreground">
              {tEdit("storageLocationHint")}
            </p>
          </div>
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
