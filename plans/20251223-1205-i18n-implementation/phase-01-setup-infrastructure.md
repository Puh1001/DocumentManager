# Phase 01: Setup next-intl Infrastructure

**Date:** 2025-12-23  
**Priority:** High  
**Status:** ✅ Completed  
**Review Status:** ⏳ Not Reviewed

## Context Links

- [Main Plan](./plan.md)
- [Research: i18n Solutions](./research/researcher-01-i18n-solutions.md)
- [Scout Report](./scout/scout-01-codebase-analysis.md)

## Overview

Install and configure `next-intl` library, create translation file structure, and set up locale detection.

## Key Insights

- next-intl requires middleware for locale detection
- Translation files should be organized by feature/page
- TypeScript types can be generated for type-safe translations
- Default locale should be Vietnamese (vi) per project requirements

## Requirements

### Functional

- Install next-intl package
- Create translation files for en, vi, zh
- Configure middleware for locale routing
- Set up i18n configuration
- Create translation utilities

### Non-Functional

- Type-safe translations with TypeScript
- Performance: Lazy load translations per route
- SEO: Proper locale metadata

## Architecture

```
apps/web/
├── messages/
│   ├── en/
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── dashboard.json
│   │   ├── documents.json
│   │   └── errors.json
│   ├── vi/
│   │   └── (same structure)
│   └── zh/
│       └── (same structure)
├── i18n/
│   ├── request.ts          # Server-side i18n config
│   ├── config.ts           # Locale configuration
│   └── types.ts            # TypeScript types
└── middleware.ts           # Locale detection middleware
```

## Related Code Files

### Files to Create

- `apps/web/messages/en/common.json`
- `apps/web/messages/en/auth.json`
- `apps/web/messages/en/dashboard.json`
- `apps/web/messages/en/documents.json`
- `apps/web/messages/en/errors.json`
- `apps/web/messages/vi/*.json` (same structure)
- `apps/web/messages/zh/*.json` (same structure)
- `apps/web/i18n/request.ts`
- `apps/web/i18n/config.ts`
- `apps/web/i18n/types.ts`
- `apps/web/middleware.ts`

### Files to Modify

- `apps/web/package.json` - Add next-intl dependency
- `apps/web/next.config.js` - Update config if needed
- `apps/web/tsconfig.json` - Add path aliases if needed

## Implementation Steps

1. **Install next-intl**

   ```bash
   cd apps/web
   npm install next-intl
   ```

2. **Create i18n configuration**
   - Create `apps/web/i18n/config.ts` with locale definitions
   - Define supported locales: `['en', 'vi', 'zh']`
   - Set default locale: `'vi'`

3. **Create middleware**
   - Create `apps/web/middleware.ts`
   - Implement locale detection from headers
   - Handle locale routing

4. **Create translation file structure**
   - Create `apps/web/messages/` directory
   - Create subdirectories for each locale
   - Create initial JSON files with placeholder content

5. **Create i18n request utility**
   - Create `apps/web/i18n/request.ts` for Server Components
   - Export `getTranslations()` helper

6. **Update TypeScript config**
   - Add type definitions for translation keys
   - Create `apps/web/i18n/types.ts` if needed

7. **Test basic setup**
   - Verify middleware works
   - Test locale detection
   - Verify translation file loading

## Todo List

- [x] Install next-intl package
- [x] Create i18n configuration file
- [x] Create middleware for locale detection
- [x] Create translation file structure (en, vi, zh)
- [x] Create initial translation files with common keys
- [x] Create i18n request utility
- [x] Update TypeScript types
- [ ] Test middleware and locale detection (requires dev server)

## Success Criteria

- ✅ next-intl installed and configured
- ✅ Middleware detects locale from browser/headers
- ✅ Translation files load correctly
- ✅ TypeScript types work for translations
- ✅ No build errors
- ✅ Basic locale switching works

## Risk Assessment

| Risk                   | Impact | Mitigation                          |
| ---------------------- | ------ | ----------------------------------- |
| Middleware conflicts   | Medium | Test with existing middleware       |
| Type generation issues | Low    | Manual type definitions as fallback |
| Performance impact     | Low    | Lazy load translations per route    |

## Security Considerations

- Validate locale input to prevent path traversal
- Sanitize translation content (XSS prevention)
- Rate limit locale switching if needed

## Next Steps

- Proceed to Phase 02: Frontend Component Translation
- Dependencies: This phase must complete before Phase 02
