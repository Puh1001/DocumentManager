# Phase 05: Filtering – Code Review

**Scope:** Phase 05 (populate Level filter with real data).  
**Checked against:** `./docs/code-standards.md`.

---

## Summary

Phase 05 meets the goal: the **Level** filter dropdown is now populated from `GET /storage/document-levels`, and selecting a level continues to filter via query param `level` on `GET /storage/documents` (backend maps it to `levelId`).

---

## Critical Issues

**None.** No correctness/security blockers found.

---

## Suggestions

### 1. Reduce duplication: unify “document levels” fetching (DRY)

- **Where:** `DocumentsPage` fetches levels; `LevelSelector` also fetches levels.
- **Why:** Same endpoint + same active/sort logic duplicated.
- **Suggestion:** Extract a small `useDocumentLevels()` hook (or a shared util in `lib/`) that returns `{ levels, loading, error }`. Then both toolbar and level selector can reuse it.

### 2. Avoid importing types from component modules

- **Where:** `DocumentsPage` imports `DocumentLevel` type from `components/documents/level-selector`.
- **Why:** Types tied to component modules can create awkward dependencies.
- **Suggestion:** Move `DocumentLevel` type (and maybe `getLevelDisplayName`) into `apps/web/src/lib/types/` (or reuse `apps/web/src/lib/types/document.types.ts` if you expand it to include `isActive`/`sortOrder`), then import from there.

### 3. Optional UX: show “loading levels” state in toolbar

- **Where:** `DocumentToolbar` level dropdown.
- **Current:** If levels aren’t loaded yet, dropdown just shows “All Levels”.
- **Suggestion:** Add `levelsLoading` boolean (or infer from empty + a separate loading state) and show a disabled select/placeholder similar to `LevelSelector`.

---

## Positive Feedback

- **KISS:** Reused existing backend endpoint `GET /storage/document-levels` instead of adding a new one.
- **Compatibility:** Query param remains `level` and matches backend `QueryDocumentsDto.level`.
- **Locale-aware label:** `getLevelDisplayName(level, locale)` ensures localized level names.
- **Build confidence:** Web production build passes (Next.js warnings only about missing Next ESLint plugin, unrelated to logic).

---

## Implementation Status (Applied)

**Applied (2026-01-30):**

- Added shared hook `useDocumentLevels()` (`apps/web/src/hooks/use-document-levels.ts`) and used it in both `DocumentsPage` and `LevelSelector`.
- Moved `DocumentLevel` fields (`isActive`, `sortOrder`) and `getDocumentLevelDisplayName()` into `apps/web/src/lib/types/document.types.ts`.
- Added toolbar loading state (`levelsLoading`) and `documents.filters.loadingLevels` (en/vi/zh).
