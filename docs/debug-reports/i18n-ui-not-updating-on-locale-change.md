# Debug Report: UI Not Updating When Changing Locale

**Date:** 2025-01-22  
**Issue:** When selecting Chinese (zh) or Vietnamese (vi) locale, the UI does not change - all text remains in English despite URL showing `/zh/dashboard` or `/vi/dashboard`.

## Problem Summary

The language switcher changes the URL correctly (e.g., `/zh/dashboard`), but the UI components continue to display English text instead of the selected language. This affects:

- Sidebar navigation items
- Dashboard page content
- Header search placeholder
- All translated text elements

## Root Cause Investigation

### Phase 1: Evidence Gathering

1. **URL Routing:**
   - URL correctly shows locale segment (`/zh/dashboard`, `/vi/dashboard`) ✅
   - Middleware configured correctly ✅
   - Language switcher updates URL ✅

2. **Message Files:**
   - All locale message files exist (`messages/zh/`, `messages/vi/`, `messages/en/`) ✅
   - Message files contain correct translations ✅
   - Message structure matches expected format ✅

3. **Configuration:**
   - `i18n/request.ts` configured with `getRequestConfig` ✅
   - `next.config.mjs` uses `createNextIntlPlugin()` ✅
   - Middleware uses `createMiddleware(routing)` ✅

4. **Component Usage:**
   - Components use `useTranslations("namespace")` correctly ✅
   - `NextIntlClientProvider` receives `messages` and `locale` props ✅

### Phase 2: Pattern Analysis

**Expected Behavior:**

- When locale changes, `getMessages()` should load messages for the new locale
- `NextIntlClientProvider` should provide new messages to child components
- Components using `useTranslations()` should receive updated translations

**Current State:**

- `getMessages()` was called without explicit locale parameter
- `NextIntlClientProvider` might not be re-rendering when locale changes
- Full page reload might not be triggering server component re-render

### Phase 3: Root Cause

**Root Cause:** `getMessages()` was not receiving the locale explicitly, and `NextIntlClientProvider` was not forcing a re-render when locale changed.

When `getMessages()` is called without parameters in a `[locale]` route, it should automatically detect the locale from the route params. However, explicitly passing the locale ensures the correct messages are loaded. Additionally, React might not re-render `NextIntlClientProvider` when only props change, so a `key` prop is needed to force re-mounting.

## Fix Plan

### Fix 1: Pass Locale Explicitly to `getMessages()`

- **File:** `apps/web/src/app/[locale]/layout.tsx`
- **Change:** `const messages = await getMessages({ locale });`
- **Reason:** Ensures correct locale is used when loading messages

### Fix 2: Add Key Prop to Force Re-render

- **File:** `apps/web/src/app/[locale]/layout.tsx`
- **Change:** Add `key={locale}` to `NextIntlClientProvider`
- **Reason:** Forces React to re-mount the provider when locale changes, ensuring new messages are applied

### Fix 3: Ensure Full Page Reload

- **File:** `apps/web/src/components/layout/language-switcher.tsx`
- **Status:** Already implemented (uses `window.location.href`)
- **Reason:** Ensures server components re-render with new locale

## Evidence

- ✅ Locale message files exist and contain translations
- ✅ URL routing works correctly
- ✅ Components use `useTranslations()` correctly
- ✅ `getMessages()` now receives explicit locale
- ✅ `NextIntlClientProvider` has `key={locale}` prop

## Solution Applied

### Changes Made:

1. **`apps/web/src/app/[locale]/layout.tsx`:**

   ```typescript
   // Before:
   const messages = await getMessages();

   // After:
   const messages = await getMessages({ locale });
   ```

2. **`apps/web/src/app/[locale]/layout.tsx`:**

   ```typescript
   // Before:
   <NextIntlClientProvider messages={messages} locale={locale}>

   // After:
   <NextIntlClientProvider
     messages={messages}
     locale={locale}
     key={locale} // Force re-render when locale changes
   >
   ```

## Testing Steps

1. **Restart dev server:**

   ```bash
   cd apps/web
   npm run dev
   ```

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

3. **Test locale switching:**
   - Navigate to `/en/dashboard`
   - Click language switcher and select "中文" (Chinese)
   - Verify URL changes to `/zh/dashboard`
   - Verify UI text changes to Chinese:
     - Sidebar: "仪表板", "文档", "部门", etc.
     - Dashboard: "仪表板", "ISO 文档管理系统概览", etc.
   - Click language switcher and select "Tiếng Việt" (Vietnamese)
   - Verify URL changes to `/vi/dashboard`
   - Verify UI text changes to Vietnamese:
     - Sidebar: "Dashboard", "Tài liệu", "Phòng ban", etc.
     - Dashboard: "Dashboard", "Tổng quan hệ thống quản lý tài liệu ISO", etc.

4. **Verify all pages:**
   - Test navigation between pages (Documents, KPI, Departments, etc.)
   - Verify translations persist across navigation
   - Verify language switcher works on all pages

## Expected Outcome

After applying these fixes and restarting the dev server:

- ✅ Selecting Chinese locale shows Chinese text
- ✅ Selecting Vietnamese locale shows Vietnamese text
- ✅ Selecting English locale shows English text
- ✅ Language changes persist across page navigation
- ✅ All UI elements (sidebar, header, content) update correctly

## Next Steps

If issues persist after restarting the dev server:

1. Check browser console for errors
2. Verify `.next` cache is cleared
3. Check network tab to ensure message files are being loaded
4. Add console.log to verify messages are loaded correctly:
   ```typescript
   console.log("Locale:", locale);
   console.log("Messages:", Object.keys(messages));
   ```
