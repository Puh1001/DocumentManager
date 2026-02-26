# Phase 06: Boss Dashboard – Client Tab

## Context
- Parent: [plan.md](plan.md)
- Depends on: Phase 02 (API), Phase 04 (Client page/table pattern)
- Docs: [research/researcher-02-permissions-and-ui.md](research/researcher-02-permissions-and-ui.md), [scout/scout-01-client-related-paths.md](scout/scout-01-client-related-paths.md)

## Overview
- **Date:** 2026-02-26  
- **Priority:** High  
- **Status:** Done  
- **Description:** Add "Client" tab on Boss dashboard next to Departments, KPI Status, ISO Overview; show read-only list of client files; support ?tab=client.

## Key Insights
- Boss page: homeTab state 'departments' | 'kpiStatus' | 'isoOverview'; add 'client'. Tab bar is array of [tab, label]; add ['client', t('viewType.client')].
- Content: when homeTab === 'client' render a component that fetches and displays client files (read-only: view/download, no upload/delete). Reuse same list API GET /client/files; can reuse ClientFileTable with read-only prop or create BossClientTab that uses same API.
- URL: existing effect reads searchParams.get('tab'); extend to set homeTab to 'client' when tab === 'client'.

## Requirements
- Functional: New tab "Client" in Boss home tab bar; label from i18n (e.g. boss.viewType.client).
- Functional: Tab content: list of client files (name, type, size, uploaded by, date); view/download only; no upload/delete.
- Functional: URL ?tab=client opens Boss page with Client tab selected.

## Architecture
- Boss page: extend HomeTab type to include 'client'; add ['client', t('viewType.client')] to tabs array; in effect, if tab === 'client' set homeTab('client'); add branch { homeTab === 'client' && <BossClientTab /> }.
- BossClientTab: fetch GET /client/files (same as main Client page); render table or compact list; view/download links only. Can live in components/boss/boss-client-tab.tsx and use shared API getClientFiles.

## Related Code
- Modify: `apps/web/src/app/[locale]/dashboard/boss/page.tsx` – HomeTab type, tabs array, effect, render BossClientTab
- Create: `apps/web/src/components/boss/boss-client-tab.tsx` – read-only client files list

## Implementation Steps
1. In boss/page.tsx: change type HomeTab to include 'client'; add to tabs array the entry for 'client' with label from t('viewType.client').
2. In the useEffect that reads searchParams.get('tab'), add condition for tab === 'client' to setHomeTab('client').
3. Add block: { homeTab === 'client' && <div className="..."><BossClientTab /></div> } (reuse animation classes as other tabs).
4. Create BossClientTab: use getClientFiles(); state list, loading, error; render table or list with columns name, type, size, uploadedBy, date; link to view or download (use existing document view/download if applicable, or link to /dashboard/client with focus on file). No upload/delete buttons.
5. i18n: add boss.viewType.client (e.g. "Client" or "Client files").

## Todo
- [x] Extend HomeTab and tabs in boss page
- [x] URL ?tab=client handling
- [x] BossClientTab component (read-only list)
- [x] i18n boss.viewType.client

## Success Criteria
- Boss sees Client tab; clicking shows client files list; view/download work; ?tab=client deep link works.

## Risk Assessment
- Low. Additive; boss already has view all.

## Security Considerations
- Boss has view Client from Phase 03; API list is already protected.

## Next Steps
- Phase 07: consolidate i18n and add tests.
