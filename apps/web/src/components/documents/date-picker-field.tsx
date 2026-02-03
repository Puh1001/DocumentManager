"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DatePickerFieldProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

function toInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromInputValue(s: string): Date | null {
  if (!s || !s.trim()) return null;
  const parsed = new Date(s + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function DatePickerField({
  value,
  onChange,
  placeholder,
  label,
  disabled = false,
  className,
}: DatePickerFieldProps) {
  const id = useId();
  const inputValue = toInputValue(value ?? null);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={inputValue}
        onChange={(e) => onChange(fromInputValue(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}
