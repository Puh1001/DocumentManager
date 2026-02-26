# Scout Report: Client Feature Related Paths

**Date:** 2026-02-26

## Backend (API)
- `apps/api/prisma/schema.prisma` – Folder, Document, Module, Permission; add Module "Client" + seed; optional Client folder seed/migration.
- `apps/api/src/modules/storage/services/folder.service.ts` – ensureDepartmentFolderStructure; add findOrCreateClientFolder() or ensureClientFolder().
- `apps/api/src/modules/storage/services/document.service.ts` – create document, upload; reuse for Client uploads.
- `apps/api/src/modules/storage/controllers/document.controller.ts` – upload endpoint; or new client-files controller.
- **New**: `apps/api/src/modules/client/` (or under storage: `client-file.controller.ts`, `client-file.service.ts`) – list client files (docs in Client folder), upload to Client folder, delete; guard with Client permission.
- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts` – add Client subject rules (view, create, delete for admin/DCC; view for boss).
- `apps/api/src/modules/authorization/types/ability.types.ts` – add Client interface and to Subjects.
- Seed/migration: insert Module "Client", assign permissions to admin and DCC role.

## Frontend (Web)
- `apps/web/src/app/[locale]/dashboard/client/page.tsx` – **new** Client dashboard page; PageGuard(metadata); table + filters + search + upload.
- `apps/web/src/lib/page-registry-init.ts` – import client page.
- `apps/web/src/components/layout/sidebar.tsx` – no change (uses registry); ensure Client page has correct module for permission filter.
- `apps/web/src/app/[locale]/dashboard/boss/page.tsx` – add HomeTab "client", tab button, BossClientTab component; handle ?tab=client.
- **New**: `apps/web/src/components/boss/boss-client-tab.tsx` (or client/client-file-table.tsx reusable) – list client files for boss (read-only).
- **New (optional):** `apps/web/src/components/viewers/ppt-viewer.tsx` or `client-file-viewer.tsx` – viewer for PPT/PPTX with **presentation mode** (fullscreen slideshow, next/prev slide). Reuse or extend if existing document viewer supports PPT.
- `apps/web/src/lib/types/ability.types.ts` (or `lib/types/ability.types.ts`) – add Client to Subjects.
- `apps/web/src/lib/utils/subject-validation.ts` – add "Client" to valid subjects if list exists.
- i18n: `apps/web/messages/*.json` – navigation.client, boss.viewType.client, client.*.

## Shared / Config
- `packages/shared` – no new types strictly required; client file list DTO can live in API.
