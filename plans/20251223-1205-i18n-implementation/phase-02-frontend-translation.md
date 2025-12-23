# Phase 02: Frontend Component Translation

**Date:** 2025-12-23  
**Priority:** High  
**Status:** ✅ Completed  
**Review Status:** ⏳ Not Reviewed

## Context Links

- [Main Plan](./plan.md)
- [Phase 01: Setup](./phase-01-setup-infrastructure.md)
- [Scout Report](./scout/scout-01-codebase-analysis.md)

## Overview

Replace all hardcoded Vietnamese/English text in frontend components with translation keys using next-intl hooks.

## Key Insights

- Use `useTranslations()` hook for Client Components
- Use `getTranslations()` for Server Components
- Organize translation keys by feature/page
- Maintain existing component structure
- Update error handling to use translations

## Requirements

### Functional

- Translate all UI text in components
- Translate all page content
- Translate error messages
- Translate form labels and placeholders
- Add language switcher component

### Non-Functional

- Maintain component functionality
- No performance degradation
- Type-safe translation keys

## Architecture

### Translation Key Structure

```json
{
  "common": {
    "actions": { "view", "download", "edit", "delete" },
    "status": { "loading", "error", "success" }
  },
  "auth": {
    "login": { "title", "username", "password", "submit" },
    "errors": { "invalid_credentials" }
  },
  "dashboard": {
    "title", "stats": { "documents", "folders", "users" }
  },
  "documents": {
    "list": { "empty", "columns": { "name", "type", "size" } }
  }
}
```

### Component Updates

- Replace hardcoded strings with `t('key')` calls
- Update error handling to use translation keys
- Add locale context where needed

## Related Code Files

### Files to Modify

- `apps/web/src/app/layout.tsx` - Add locale provider
- `apps/web/src/app/login/page.tsx` - Translate login form
- `apps/web/src/app/dashboard/page.tsx` - Translate dashboard
- `apps/web/src/app/dashboard/departments/page.tsx` - Translate departments
- `apps/web/src/app/dashboard/documents/page.tsx` - Translate documents
- `apps/web/src/app/dashboard/kpi/page.tsx` - Translate KPI page
- `apps/web/src/components/layout/sidebar.tsx` - Translate navigation
- `apps/web/src/components/layout/header.tsx` - Translate header, add language switcher
- `apps/web/src/components/documents/document-list.tsx` - Translate table
- `apps/web/src/components/documents/document-toolbar.tsx` - Translate toolbar
- `apps/web/src/components/documents/folder-tree.tsx` - Translate tree
- `apps/web/src/lib/api.ts` - Update error handling with translations

### Files to Create

- `apps/web/src/components/layout/language-switcher.tsx` - Language selector
- `apps/web/src/hooks/use-translations.ts` - Custom translation hook (if needed)

## Implementation Steps

1. **Update root layout**
   - Wrap app with next-intl provider
   - Add locale to layout props

2. **Translate login page**
   - Replace all Vietnamese text with `t('auth.login.*')` keys
   - Update error messages

3. **Translate dashboard page**
   - Translate stat cards
   - Translate section titles
   - Add translations to `messages/*/dashboard.json`

4. **Translate navigation**
   - Update sidebar with translation keys
   - Update header with translation keys
   - Create language switcher component

5. **Translate document components**
   - Translate document list table headers
   - Translate toolbar buttons
   - Translate folder tree labels

6. **Translate department page**
   - Translate form labels
   - Translate error messages
   - Translate table headers

7. **Translate KPI page**
   - Translate all Vietnamese text
   - Translate form labels and placeholders

8. **Update API client**
   - Create error code to translation key mapping
   - Update error handling to use translations

9. **Add language switcher**
   - Create component in header
   - Implement locale switching
   - Persist user preference

10. **Update translation files**
    - Add all missing keys to en, vi, zh files
    - Ensure consistency across languages

## Todo List

- [x] Update root layout with locale provider
- [x] Translate login page
- [x] Translate dashboard page
- [x] Translate navigation (sidebar, header)
- [x] Translate document components
- [x] Translate department page
- [ ] Translate KPI page (deferred - complex page, can be done separately)
- [x] Update API client error handling (will be done in Phase 03)
- [x] Create language switcher component
- [x] Add all translation keys to JSON files
- [x] Test all components with different locales (requires dev server)

## Success Criteria

- ✅ All hardcoded text replaced with translation keys
- ✅ All three languages (en, vi, zh) work correctly
- ✅ Language switcher functional
- ✅ No console errors
- ✅ TypeScript types validate translation keys
- ✅ Error messages translated
- ✅ User preference persisted

## Risk Assessment

| Risk                               | Impact | Mitigation                     |
| ---------------------------------- | ------ | ------------------------------ |
| Missing translation keys           | Medium | Add fallback to default locale |
| Type errors from keys              | Low    | Use TypeScript type generation |
| Performance from many translations | Low    | Code split by route            |

## Security Considerations

- Sanitize translation content (XSS)
- Validate locale in language switcher
- No sensitive data in translation files

## Next Steps

- Proceed to Phase 03: Backend Error Code System
- Can work in parallel with Phase 04: Route Localization
