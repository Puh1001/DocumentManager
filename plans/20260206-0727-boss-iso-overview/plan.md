# Boss ISO Documents Overview Page

## Overview
Add a dedicated page under Boss UI to view ISO documents overview (total count, paginated list, filters). Style matches existing Boss cyber theme (cyber-bg, cyber-card, font-cyber, cyan/fuchsia).

## Scope
- New route: `/[locale]/dashboard/boss/iso-documents` (uses existing Boss layout).
- Page: stats (total), optional department/level filters, paginated document list with link to view.
- Entry: Boss home — add button/card "ISO Overview" linking to the new page.
- Reuse: GET /storage/documents (existing; boss has access). No new API.

## Phases
1. **phase-01-page-and-entry** — Create iso-documents page component and add entry from boss home.

## Out of scope
- New stats API (by-department/by-level breakdown). Can add later if needed.
