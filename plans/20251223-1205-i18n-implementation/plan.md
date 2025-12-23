# i18n Implementation Plan

**Created:** 2025-12-23  
**Status:** 📋 Planning Complete  
**Languages:** English (en), Vietnamese (vi), Chinese (zh)

## Overview

Implement comprehensive internationalization (i18n) for the ISO Document Management System using `next-intl` for Next.js 14 App Router. Support three languages: English, Vietnamese, and Chinese.

## Implementation Phases

| Phase | Name                           | Status     | Progress |
| ----- | ------------------------------ | ---------- | -------- |
| 01    | Setup next-intl Infrastructure | 🔲 Pending | 0%       |
| 02    | Frontend Component Translation | 🔲 Pending | 0%       |
| 03    | Backend Error Code System      | 🔲 Pending | 0%       |
| 04    | Route Localization             | 🔲 Pending | 0%       |
| 05    | Testing & Validation           | 🔲 Pending | 0%       |

## Key Decisions

- **Library:** next-intl (App Router compatible)
- **Default locale:** Vietnamese (vi)
- **Route structure:** `/[locale]/dashboard/...`
- **Backend strategy:** Error codes with frontend translation
- **Translation format:** JSON files per locale

## Dependencies

- Next.js 14 App Router
- TypeScript
- Existing component structure

## Timeline Estimate

- **Phase 1-2:** 2-3 days (Setup + Frontend)
- **Phase 3:** 1-2 days (Backend)
- **Phase 4:** 1 day (Routing)
- **Phase 5:** 1 day (Testing)
- **Total:** ~5-7 days

## Related Files

- [Phase 01: Setup Infrastructure](./phase-01-setup-infrastructure.md)
- [Phase 02: Frontend Translation](./phase-02-frontend-translation.md)
- [Phase 03: Backend Error Codes](./phase-03-backend-error-codes.md)
- [Phase 04: Route Localization](./phase-04-route-localization.md)
- [Phase 05: Testing](./phase-05-testing.md)

## Research Reports

- [Researcher 01: i18n Solutions](./research/researcher-01-i18n-solutions.md)
- [Researcher 02: Backend Strategy](./research/researcher-02-backend-i18n.md)
- [Scout Report: Codebase Analysis](./scout/scout-01-codebase-analysis.md)
