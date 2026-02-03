# Phase 01: Rename & Navigation (documents → ISO Document)

## Context
- Parent: [plan.md](plan.md)
- Research: [researcher-01-report.md](research/researcher-01-report.md)

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Change all user-visible "documents" labels to "ISO Document" (or localized equivalent). No route or code-identifier changes.
- **Implementation status:** Done
- **Review status:** Done ([phase-01-code-review.md](reports/phase-01-code-review.md))

## Key insights
- Sidebar uses `t("navigation.documents")` from common.json (special page, not registry).
- Documents page uses `useTranslations("documents")`; title from documents.json.
- Boss dashboard and permissions copy reference "documents"; update boss.json and optionally permissions/dashboard.

## Requirements
- **Functional:** Nav item, page title, and related labels show "ISO Document" (en) / "Tài liệu ISO" (vi) / "ISO文档" (zh) where applicable.
- **Non-functional:** No API or route changes; i18n keys and viewType remain for minimal change.

## Architecture
- Display-only changes in `apps/web/messages/{en,vi,zh}/*.json`.
- No backend or page-registry changes.

## Related code files
| File | Action |
|------|--------|
| `apps/web/messages/en/common.json` | Modify `navigation.documents` |
| `apps/web/messages/vi/common.json` | Modify `navigation.documents` |
| `apps/web/messages/zh/common.json` | Modify `navigation.documents` |
| `apps/web/messages/en/documents.json` | Modify `title`, `description` |
| `apps/web/messages/vi/documents.json` | Modify `title`, `description` (if exists) |
| `apps/web/messages/zh/documents.json` | Modify `title`, `description` (if exists) |
| `apps/web/messages/en/boss.json` | Modify documents-related labels |
| `apps/web/messages/vi/boss.json` | Modify documents-related labels |
| `apps/web/messages/zh/boss.json` | Modify documents-related labels |
| `apps/web/messages/*/permissions.json` | Optional: "Documents page" → "ISO Document page" |
| `apps/web/messages/*/dashboard.json` | Optional: "Total Documents" → "Total ISO Documents" etc. |

## Implementation steps
1. Set `common.navigation.documents` to "ISO Document" (en), "Tài liệu ISO" (vi), "ISO文档" (zh).
2. Set `documents.title` to "ISO Document" and align description in en/vi/zh.
3. In boss.json (en/vi/zh): update "documents", "View documents", "No documents", etc. to ISO Document wording.
4. Optionally update permissions.json and dashboard.json for consistency.
5. Smoke-test: sidebar, documents page title, boss tab/labels.

## Todo list
- [x] common.json (en/vi/zh) navigation.documents
- [x] documents.json (en/vi/zh) title/description
- [x] boss.json (en/vi/zh) documents labels
- [x] Optional: permissions.json, dashboard.json (done per code-review suggestions)
- [x] Verify: JSON valid; build compiles (type-check EPERM is sandbox env)

## Success criteria
- Sidebar shows "ISO Document" (or locale equivalent).
- Documents page heading/title shows "ISO Document".
- Boss "documents" tab/labels show ISO Document wording.
- No regression in other pages.

## Risk assessment
- Low: string-only changes; fallback to existing keys if translation missing.

## Security considerations
- None for i18n-only changes.

## Next steps
- Proceed to Phase 02 (table view & filters) after Phase 01 verification.
