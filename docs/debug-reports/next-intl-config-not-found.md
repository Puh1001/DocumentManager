# Debug Report: next-intl Config File Not Found

**Date:** 2025-01-22  
**Error:** `Couldn't find next-intl config file. Please follow the instructions at https://next-intl.dev/docs/getting-started/app-router`  
**Location:** `apps/web/src/app/[locale]/layout.tsx:31:88`

## Problem Summary

The Next.js dev server is reporting that it cannot find the next-intl configuration file, even though the file exists at `apps/web/i18n/request.ts`.

## Root Cause Investigation

### Phase 1: Evidence Gathering

1. **File Location:**
   - Config file exists at: `apps/web/i18n/request.ts` ✅
   - Project root: `apps/web/` (same level as `next.config.js`) ✅
   - File content: Valid `getRequestConfig` export ✅

2. **Error Context:**
   - Error occurs when `getMessages()` is called in `layout.tsx:26`
   - Error message points to `layout.tsx:31:88` (inside NextIntlClientProvider)
   - next-intl version: `4.6.1`

3. **File Structure:**
   ```
   apps/web/
   ├── i18n/
   │   ├── request.ts  ✅ (exists)
   │   ├── routing.ts
   │   └── types.ts
   ├── messages/
   ├── src/
   │   └── app/
   │       └── [locale]/
   │           └── layout.tsx  (calls getMessages())
   └── next.config.js
   ```

### Phase 2: Pattern Analysis

According to next-intl v4 documentation:

- Config file should be at: `i18n/request.ts` (project root) ✅
- File should export default `getRequestConfig(...)` ✅
- File structure matches documentation ✅

**Hypothesis:** Next.js module resolution might be looking for the file relative to `src/` directory, or there's a caching issue.

### Phase 3: Hypothesis Testing

**Hypothesis 1:** Next.js dev server cache issue

- **Test:** Restart dev server and clear `.next` cache
- **Status:** Pending user action

**Hypothesis 2:** File needs to be in `src/i18n/request.ts` instead

- **Test:** Check if creating file in `src/i18n/` resolves issue
- **Status:** Not recommended (against next-intl v4 docs)

**Hypothesis 3:** Module resolution path issue in monorepo

- **Test:** Check if `next.config.js` needs path configuration
- **Status:** Investigating

## Fix Plan

1. **Immediate Actions:**
   - Verify file exists and is readable
   - Check file permissions
   - Restart Next.js dev server
   - Clear `.next` cache directory

2. **If Issue Persists:**
   - Check next-intl v4.6.1 specific requirements
   - Verify TypeScript compilation includes the file
   - Check if `tsconfig.json` paths affect resolution
   - Consider adding explicit path configuration

## Evidence

- File exists: `apps/web/i18n/request.ts` ✅
- File content: Valid export ✅
- next-intl version: `4.6.1` ✅
- Error location: `layout.tsx:31:88` (NextIntlClientProvider)

## Next Steps

1. Restart dev server: `npm run dev --workspace=@iso-docs/web`
2. Clear cache: `rm -rf apps/web/.next`
3. Verify file is included in TypeScript compilation
4. Check if issue persists after restart
