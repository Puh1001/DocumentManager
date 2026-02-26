# Research: Permissions, Page Registry & Boss Tab for Client

**Date:** 2026-02-26  
**Scope:** Who can access Client (DCC, admin); page registry and sidebar; boss dashboard tab.

## Key Findings

### 1. Permissions (RBAC + ABAC)
- **Subjects**: Document, Folder, User, Department, Kpi, Maintenance, Permission, Module (see `ability.types.ts`). No "Client" subject yet.
- **Options**: (A) Add new subject **Client** (or **ClientFile**) and module "Client" in DB; (B) Treat client files as **Document** in a special Client folder and guard by folder/resource. Recommendation: **Add subject "Client"** (and Module "Client") so page and actions (view, create, delete) are explicit; list API can filter by Client folder.
- **Roles**: DCC and admin can upload; requirement: "khách hàng, hoặc users có role dcc và admin". So: view for relevant roles; create/delete for admin and DCC. Boss: read-only (view/download) like other resources.
- **Backend**: New module "Client" in DB; role-permission for view/create/delete; PoliciesGuard + CheckPolicies on new Client controller. CASL ability factory must include rules for "Client" subject.

### 2. Sidebar & Page Registry
- **Sidebar**: Uses `usePages()` from page registry; pages registered via `page-registry-init.ts` (import dashboard pages). Each page exports `pageMetadata`: path, name, module, action, icon, order.
- **New page**: Add `apps/web/src/app/[locale]/dashboard/client/page.tsx` with `pageMetadata`: path `/dashboard/client`, module `Client`, action `view`, icon e.g. `Users` or `FolderOpen`, order after documents.
- **page-registry-init.ts**: Add `import "@/app/[locale]/dashboard/client/page";`
- **Subject validation**: `lib/utils/subject-validation.ts` and frontend ability types: add "Client" to Subjects so `useCanAccess('view', 'Client')` works.

### 3. Boss Dashboard Tab
- **Current tabs**: `departments` | `kpiStatus` | `isoOverview` (see `boss/page.tsx`). Type `HomeTab` and tab array with labels; content: DepartmentGrid, DepartmentKpiStatus, BossIsoOverviewTab.
- **New tab**: Add `client` to `HomeTab`; add tab button "Client" (or translated label); when `homeTab === "client"` render a new component e.g. `BossClientTab` that lists client files (read-only for boss) – reuse list/table from main Client page or a simplified view.
- **URL**: Support `?tab=client` so deep link works (same pattern as isoOverview).

### 4. Client Page UI (Dashboard)
- **Route**: `/dashboard/client`.
- **Content**: Table of uploaded client files; columns: name, type, size, uploaded by, date; filters (e.g. file type, date range); search bar (by name); upload button (DCC/admin). Reuse patterns from documents table or KPI attachment list (filters + search).
- **Upload**: Modal or inline upload; allowed types: doc, docx, xls, xlsx, ppt, pptx, **pdf**. Backend validates and stores in Client folder.
- **Viewer**: For PPT/PPTX, support **presentation mode** (chế độ trình chiếu): fullscreen slideshow with next/previous slide.

## References
- `apps/web/src/lib/page-registry-init.ts` – page imports.
- `apps/web/src/app/[locale]/dashboard/boss/page.tsx` – HomeTab, tabs, BossIsoOverviewTab.
- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts` – subject rules.
- `apps/web/src/lib/types/ability.types.ts` (or equivalent) – frontend Subjects.

## Unresolved
- Exact translation keys for "Client" (navigation and boss tab).
- Whether boss Client tab shows full table or compact list.
