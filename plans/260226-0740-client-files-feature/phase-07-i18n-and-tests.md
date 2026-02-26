# Phase 07: i18n & Tests

## Context
- Parent: [plan.md](plan.md)
- Depends on: Phases 04, 05, 06 (all UI in place)
- Docs: [code-standards.md](../../docs/code-standards.md)

## Overview
- **Date:** 2026-02-26  
- **Priority:** Medium  
- **Status:** Done  
- **Description:** Add/complete translations for Client feature (EN, VI, ZH); add unit/integration tests for backend and optional e2e for frontend.

## Key Insights
- Project uses next-intl; messages in apps/web/messages (en.json, vi.json, zh.json). Add keys under common.navigation.client, client.*, boss.viewType.client.
- Backend: test ClientService (ensureClientFolder, list, upload, delete), ClientController (guards, 403 for unauthorized). Reuse existing test patterns (NestJS testing module).

## Requirements
- Functional: All user-facing strings for Client feature have EN, VI, ZH.
- Functional: Backend tests for Client module (service + controller); permission tests (admin/dcc can, other cannot).
- Non-functional: No regressions; follow project test conventions.

## Architecture
- i18n: Add keys to en.json, vi.json, zh.json (navigation, page title, table headers, buttons, messages, boss tab).
- Tests: client.service.spec.ts, client.controller.spec.ts; mock FolderService, DocumentService; test ensureClientFolder idempotence, list filters, upload validation, delete auth.

## Related Code
- Modify: `apps/web/messages/en.json`, `vi.json`, `zh.json`
- Create: `apps/api/src/modules/client/client.service.spec.ts`, `client.controller.spec.ts`

## Implementation Steps
1. List all Client UI strings (page title, table headers, search placeholder, filter labels, upload button, delete confirm, empty state, boss tab label, errors; **viewer: presentation mode button/tooltip** for PPT – e.g. client.viewer.presentationMode, client.viewer.nextSlide, client.viewer.prevSlide). Add to en.json under client.* and common/boss as needed; copy structure to vi.json and zh.json with translations.
2. Client.service.spec.ts: test ensureClientFolder returns id; test list returns only client folder documents and respects search/fileType; test upload rejects invalid type; test delete checks folder.
3. Client.controller.spec.ts: test GET/POST/DELETE with JwtAuthGuard and PoliciesGuard; test 403 when user lacks Client permission.
4. Run existing test suite; fix any failures. Optionally add e2e for: login as admin, open Client page, upload file, see row, delete (if project has e2e).

## Todo
- [x] i18n keys EN/VI/ZH for Client
- [x] ClientService unit tests
- [x] ClientController tests (auth + permissions)
- [x] Run full test suite

## Success Criteria
- No missing translation keys for Client; backend tests pass; lint and type-check pass.

## Risk Assessment
- Low.

## Security Considerations
- Tests verify 403 for unauthorized roles.

## Next Steps
- Implementation complete; optional docs update (README, system-architecture, codebase-summary) to mention Client feature.
