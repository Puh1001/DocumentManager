"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { userApi, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface UserPickerProps {
  value?: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  label: string;
  disabled?: boolean;
  className?: string;
  /** If provided, use this list instead of fetching (avoids duplicate requests when multiple pickers in same dialog). */
  users?: User[] | null;
  usersLoading?: boolean;
}

const EMPTY_USERS: User[] = [];

function userDisplayName(user: User): string {
  const name = user.fullName?.trim() || user.username || user.id;
  const dept = user.department ?? user.departments?.[0]?.name;
  return dept ? `${name} (${dept})` : name;
}

export function UserPicker({
  value,
  onChange,
  placeholder,
  label,
  disabled = false,
  className,
  users: usersProp,
  usersLoading: usersLoadingProp,
}: UserPickerProps) {
  const t = useTranslations("documents.editMetadata");
  const [usersInternal, setUsersInternal] = useState<User[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const useExternalUsers = usersProp !== undefined;
  const users = useMemo(
    () => (useExternalUsers ? (usersProp ?? EMPTY_USERS) : usersInternal),
    [useExternalUsers, usersProp, usersInternal]
  );
  const loading = useExternalUsers
    ? (usersLoadingProp ?? false)
    : loadingInternal;

  useEffect(() => {
    if (useExternalUsers) return;
    let cancelled = false;
    setLoadingInternal(true);
    userApi
      .getAll({ limit: 300, isActive: true })
      .then((res) => {
        if (!cancelled && res.data) {
          setUsersInternal(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setUsersInternal([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInternal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useExternalUsers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.departments?.some((d) => d.name?.toLowerCase().includes(q))
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => (value ? users.find((u) => u.id === value) : null),
    [users, value]
  );

  const displayValue = selectedUser ? userDisplayName(selectedUser) : "";
  const noneLabel = placeholder ?? "None";

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideList = listRef.current?.contains(target);
      if (!insideTrigger && !insideList) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (loading) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label className="text-muted-foreground">{label}</Label>
        <div className="h-9 rounded-md border border-input bg-muted/50 flex items-center px-3 text-sm text-muted-foreground">
          {placeholder ?? t("loadingUsers")}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-muted-foreground">{label}</Label>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!disabled) setOpen((o) => !o);
          }}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !displayValue && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayValue || noneLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
        {open && (
          <div
            ref={listRef}
            data-user-picker-list
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 min-w-[280px] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
            role="listbox"
          >
            <div className="sticky top-0 z-10 border-b bg-popover p-1">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchUsers")}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <ul className="py-1">
              <li
                role="option"
                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(null);
                  setOpen(false);
                }}
              >
                {noneLabel}
              </li>
              {filtered.map((u) => (
                <li
                  key={u.id}
                  role="option"
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(u.id);
                    setOpen(false);
                  }}
                >
                  {userDisplayName(u)}
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {t("noMatches")}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
