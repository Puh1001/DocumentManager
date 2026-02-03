"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = selectedUser ? userDisplayName(selectedUser) : "";

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
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      <Label className="text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="text"
          value={open ? search : displayValue}
          onChange={(e) => (open ? setSearch(e.target.value) : null)}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onBlur={() => {
            // Delay to allow click on option
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="h-9"
          readOnly={!open}
        />
        {open && (
          <ul
            className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
            role="listbox"
          >
            <li
              role="option"
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
              onMouseDown={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              {placeholder ?? "None"}
            </li>
            {filtered.map((u) => (
              <li
                key={u.id}
                role="option"
                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                onMouseDown={() => {
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
        )}
      </div>
    </div>
  );
}
