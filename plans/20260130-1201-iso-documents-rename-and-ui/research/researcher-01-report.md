# Researcher 01: Rename "documents" → "ISO Document" & Navigation

## Scope
Where "documents" appears as label/navigation; what to change for "ISO Document".

## Findings

### 1. Sidebar (primary nav)
- **File:** `apps/web/src/components/layout/sidebar.tsx`
- **Source:** Special page (hardcoded), not from page registry.
- **Label:** `t("navigation.documents")` → key in `common.json`.
- **Action:** Update `common.navigation.documents` in en/vi/zh to "ISO Document" (or equivalent).

### 2. i18n keys
| File | Key / usage | Current (en) | Target |
|------|-------------|--------------|--------|
| `apps/web/messages/en/common.json` | `navigation.documents` | "Documents" | "ISO Document" |
| `apps/web/messages/vi/common.json` | `navigation.documents` | "Tài liệu" | "Tài liệu ISO" (or "ISO Document") |
| `apps/web/messages/zh/common.json` | `navigation.documents` | "文档" | "ISO文档" |
| `apps/web/messages/en/documents.json` | `title` | "Document Management" | "ISO Document" (page title) |
| `apps/web/messages/*/documents.json` | `title`, `description` | — | Align with "ISO Document" |

### 3. Documents page
- **File:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`
- Uses `useTranslations("documents")`; page title from layout or first heading.
- No `pageMetadata` (documents is special page); no change to registry.
- **Action:** Ensure documents.json `title` = "ISO Document" so page shows correct title.

### 4. Boss dashboard
- **Files:** `apps/web/src/app/[locale]/dashboard/boss/page.tsx`, `messages/*/boss.json`
- **Usage:** `viewType: "documents"`, labels "documents", "View documents", "No documents found", etc.
- **Action:** Update boss.json labels to "ISO Document" / "View ISO documents" / "No ISO documents" where user-facing.

### 5. Other references
- **Permissions:** `permissions.json` "Folder & Document Permissions", "from the Documents page" → can stay or become "ISO Document" page for consistency.
- **Dashboard stats:** `dashboard.json` "Total Documents", "Recent Documents" → optional rename to "Total ISO Documents", "Recent ISO documents" if product wants full consistency.
- **Auth:** `auth.json` already has "ISO Document Manager" / "ISO Document Management System" — no change.

### 6. Route & code identifiers
- **Route:** `/dashboard/documents` — keep (URL slug unchanged per YAGNI).
- **Code:** `viewType: "documents"`, namespace `documents` in i18n — keep to avoid large refactor; only display text changes.

## Recommendations
1. **Rename display only:** Change all user-visible strings to "ISO Document" / localized equivalent; keep route, i18n keys, and viewType as-is.
2. **Files to touch:** `common.json` (en/vi/zh), `documents.json` (en/vi/zh), `boss.json` (en/vi/zh); optionally `permissions.json`, `dashboard.json`.
3. **No backend or API renames** for this scope.

## Unresolved
- Preferred Vietnamese/Chinese exact wording: "Tài liệu ISO" vs "ISO Document" (keep English term)?
