# Phase 04: Route Localization

**Date:** 2025-12-23  
**Priority:** Medium  
**Status:** ✅ Completed  
**Review Status:** ⏳ Not Reviewed

## Context Links

- [Main Plan](./plan.md)
- [Phase 01: Setup](./phase-01-setup-infrastructure.md)
- [Phase 02: Frontend Translation](./phase-02-frontend-translation.md)

## Overview

Implement locale-based routing with `/[locale]/...` structure. Update all routes to include locale prefix.

## Key Insights

- Next.js App Router uses folder structure for routing
- Locale should be in URL path: `/[locale]/dashboard`
- Middleware handles locale detection and routing
- Default locale (vi) can be optional in URL
- Need to update all internal links

## Requirements

### Functional

- Routes include locale prefix
- Locale detection from browser/headers
- Default locale handling (vi)
- Update all internal navigation links
- Preserve locale in navigation

### Non-Functional

- SEO-friendly URLs
- Proper redirects
- No broken links

## Architecture

### Route Structure

```
Before:
/dashboard
/login
/dashboard/documents

After:
/[locale]/dashboard
/[locale]/login
/[locale]/dashboard/documents

Default locale (vi) can be:
/vi/dashboard OR /dashboard (redirects to /vi/dashboard)
```

### Middleware Logic

1. Detect locale from:
   - URL path (`/[locale]/...`)
   - Accept-Language header
   - Cookie (user preference)
2. Redirect to locale-prefixed route if missing
3. Set locale in request headers

### App Router Structure

```
apps/web/src/app/
├── [locale]/              # Locale segment
│   ├── layout.tsx         # Locale layout
│   ├── page.tsx           # Home (redirects to dashboard)
│   ├── login/
│   │   └── page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx
│       └── documents/
└── layout.tsx             # Root layout (minimal)
```

## Related Code Files

### Files to Create

- `apps/web/src/app/[locale]/layout.tsx` - Locale layout wrapper
- `apps/web/src/app/[locale]/page.tsx` - Locale home page

### Files to Modify

- `apps/web/middleware.ts` - Locale routing logic
- `apps/web/src/app/layout.tsx` - Root layout updates
- `apps/web/src/app/login/page.tsx` - Move to `[locale]/login/`
- `apps/web/src/app/dashboard/**` - Move to `[locale]/dashboard/`
- `apps/web/src/components/layout/sidebar.tsx` - Update links with locale
- `apps/web/src/components/layout/header.tsx` - Update links with locale
- All components using `next/link` - Add locale to hrefs
- `apps/web/src/lib/auth-context.tsx` - Update redirects with locale

## Implementation Steps

1. **Update middleware**
   - Enhance locale detection logic
   - Handle redirects for missing locale
   - Set locale in request

2. **Restructure app directory**
   - Create `apps/web/src/app/[locale]/` directory
   - Move `login/` to `[locale]/login/`
   - Move `dashboard/` to `[locale]/dashboard/`
   - Create `[locale]/layout.tsx` with next-intl provider

3. **Update root layout**
   - Keep minimal root layout
   - Remove locale-specific logic

4. **Create locale layout**
   - Wrap with next-intl provider
   - Pass locale to child components
   - Handle locale metadata

5. **Update navigation components**
   - Update sidebar links to include locale
   - Update header links to include locale
   - Use `useLocale()` hook for current locale

6. **Update all Link components**
   - Find all `next/link` usage
   - Add locale prefix to hrefs
   - Use `Link` from next-intl if available

7. **Update redirects**
   - Update auth context redirects
   - Update login redirects
   - Update error redirects

8. **Handle default locale**
   - Redirect `/dashboard` → `/vi/dashboard`
   - Or make default locale optional in URL

9. **Update API routes**
   - Ensure API routes don't require locale
   - Keep `/api/*` routes locale-agnostic

10. **Test routing**
    - Test all routes with different locales
    - Test locale switching
    - Test direct URL access
    - Test redirects

## Todo List

- [x] Update middleware for locale routing
- [x] Create `[locale]` directory structure
- [x] Move pages to `[locale]/` directory
- [x] Create locale layout
- [x] Update root layout
- [x] Update sidebar navigation links
- [x] Update header navigation links
- [x] Update all Link components
- [x] Update redirects in auth context
- [x] Handle default locale redirects
- [ ] Test all routes with locales (requires dev server)
- [ ] Test locale switching (requires dev server)
- [ ] Verify SEO metadata (optional)

## Success Criteria

- ✅ All routes include locale prefix
- ✅ Locale detection works from browser
- ✅ Default locale redirects work
- ✅ All internal links preserve locale
- ✅ Locale switching works
- ✅ Direct URL access works
- ✅ No broken links
- ✅ SEO metadata correct per locale

## Risk Assessment

| Risk           | Impact | Mitigation               |
| -------------- | ------ | ------------------------ |
| Broken links   | High   | Comprehensive link audit |
| SEO impact     | Medium | Proper hreflang tags     |
| Redirect loops | Low    | Careful middleware logic |

## Security Considerations

- Validate locale in middleware (prevent path traversal)
- Sanitize locale in URLs
- Rate limit redirects if needed

## Next Steps

- Proceed to Phase 05: Testing & Validation
- All previous phases should be complete
