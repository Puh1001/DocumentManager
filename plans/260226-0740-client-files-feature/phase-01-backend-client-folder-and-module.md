# Phase 01: Backend – Client Folder & Module

## Context
- Parent: [plan.md](plan.md)
- Depends on: None
- Docs: [codebase-summary.md](../../docs/codebase-summary.md), [system-architecture.md](../../docs/system-architecture.md), [research/researcher-01-storage-client-folder.md](research/researcher-01-storage-client-folder.md)

## Overview
- **Date:** 2026-02-26  
- **Priority:** High  
- **Status:** Done  
- **Description:** Ensure single global "Client" folder exists on SMB and in DB; add Module "Client" and seed permissions for roles.

## Key Insights
- Folder structure today is department-based; Client is global (`departmentId = null`).
- Reuse existing Folder + Document model; no new tables.
- Path: `Client` or `Client/current`; decide one and stick (recommend `Client` for flat list, or `Client/current` if versions subfolder needed later).

## Requirements
- Functional: One Folder record with path `Client` (or `Client/current`); create on SMB if missing; idempotent.
- Functional: Module "Client" in DB; seed so it exists.
- Non-functional: Race-safe folder creation (same pattern as department structure).

## Architecture
- **FolderService**: Add `ensureClientFolder(): Promise<{ clientFolderId: string }>`. Find by path `Client`; if not exists, create SMB dir + Folder row; handle P2002.
- **Schema**: No change; Folder already has optional `departmentId`.
- **Seed**: In existing seed or new migration script, insert Module (name: "Client", displayName: "Client Files") and optionally create Client folder if not exists.

## Related Code
- Modify: `apps/api/src/modules/storage/services/folder.service.ts`
- Modify: `apps/api/prisma/seed.ts` (or add client module + folder in existing seed)
- Reference: `folder.service.ts` – `ensureDepartmentFolderStructure` (find-or-create, P2002 handling)

## Implementation Steps
1. In FolderService add `ensureClientFolder()`. Path = `"Client"`. Create SMB directory, then findOrCreate Folder with `path: "Client"`, `parentId: null`, `departmentId: null`. Return folder id.
2. Add unit test for ensureClientFolder (create when missing; return existing when present).
3. In seed: insert Module with name "Client", displayName "Client Files" (or equivalent). If seed creates initial folders, call ensureClientFolder or create Client folder once.
4. Document decision: Client path is `Client` (no `current` subfolder) unless product requires versions later.

## Todo
- [x] Implement ensureClientFolder in FolderService
- [x] Add tests for ensureClientFolder
- [x] Seed Module "Client"
- [x] Optionally seed Client folder in seed script (skipped: folder created on first use via ensureClientFolder)

## Success Criteria
- ensureClientFolder returns same folder id when called multiple times; folder exists on SMB and in DB.
- Module "Client" exists after seed.

## Risk Assessment
- Low. Isolated addition; no change to existing department flow.

## Security Considerations
- Client folder is not department-scoped; access controlled by Client module permissions (Phase 03).

## Next Steps
- Phase 02: Client files API (list, upload, delete) will use client folder id from ensureClientFolder.
