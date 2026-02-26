# Phase 05: Frontend – Sidebar & Page Registry

## Context
- Parent: [plan.md](plan.md)
- Depends on: Phase 04 (Client page with pageMetadata)
- Docs: [codebase-summary.md](../../docs/codebase-summary.md), [research/researcher-02-permissions-and-ui.md](research/researcher-02-permissions-and-ui.md)

## Overview
- **Date:** 2026-02-26  
- **Priority:** High  
- **Status:** Done  
- **Description:** Register Client page in page registry so sidebar shows "Client" for users with view Client permission.

## Key Insights
- Sidebar uses usePages() which reads from page registry; pages are registered by importing them in page-registry-init.ts. Each page exports pageMetadata with module "Client"; CASL filters by ability.can('view', 'Client').
- No change to sidebar.tsx logic; only add import and ensure module name matches DB Module "Client".

## Requirements
- Functional: "Client" appears in sidebar for users with view Client permission (admin, dcc, boss).
- Functional: Click navigates to /dashboard/client (with locale).

## Architecture
- page-registry-init.ts: add `import "@/app/[locale]/dashboard/client/page";`
- Sidebar: no code change; it already filters dynamicPages by ability.can(action, module).

## Related Code
- Modify: `apps/web/src/lib/page-registry-init.ts` – add client page import

## Implementation Steps
1. Open page-registry-init.ts; add line: `import "@/app/[locale]/dashboard/client/page";`
2. Verify Client page exports pageMetadata with module: 'Client' and path: '/dashboard/client'.
3. Verify i18n: add key for navigation label (e.g. common.navigation.client or client.title) and use in page name or sidebar if needed. Sidebar may use page.name from registry; ensure pageMetadata.name is set (e.g. "Client" or t key).
4. Manual test: login as admin/dcc/boss – Client in sidebar; login as user without Client view – Client not in sidebar.

## Todo
- [x] Add client page import to page-registry-init
- [x] i18n key for Client label if required
- [x] Verify sidebar shows/hides by permission

## Success Criteria
- Client appears in sidebar for admin, dcc, boss; does not appear for users without view Client.

## Risk Assessment
- Low. Single import.

## Security Considerations
- Permission already enforced by usePages + ability; no new exposure.

## Next Steps
- Phase 06 adds Boss dashboard tab; Phase 07 i18n and tests.
