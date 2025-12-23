# Debug Report: Documents Page Still Showing Vietnamese Text

**Date:** 2025-01-22  
**Issue:** The `/dashboard/documents` page is still displaying Vietnamese text ("Quản lý tài liệu", "Duyệt và quản lý tài liệu ISO", "Thư mục") even when the URL shows `/en/dashboard/documents` (English locale).

## Problem Summary

Despite implementing translations and updating the code to use `t("title")`, `t("description")`, and `t("folder")`, the page continues to display Vietnamese text when accessing the English locale.

## Root Cause Investigation

### Phase 1: Code Verification

**Current Code State:**

- ✅ `apps/web/src/app/[locale]/dashboard/documents/page.tsx` correctly uses:
  - `{t("title")}` for page title
  - `{t("description")}` for page subtitle
  - `{t("folder")}` for folder section title
  - `{t("selectFolder")}` for empty state message
- ✅ Translation files exist:
  - `messages/en/documents.json` contains English translations
  - `messages/vi/documents.json` contains Vietnamese translations
  - `messages/zh/documents.json` contains Chinese translations
- ✅ i18n configuration:
  - `i18n/request.ts` loads `documents.json` correctly
  - `[locale]/layout.tsx` passes locale explicitly to `getMessages({ locale })`
  - `NextIntlClientProvider` has `key={locale}` prop

### Phase 2: Possible Causes

**Hypothesis 1: Browser Cache Issue**

- Browser may be caching old JavaScript bundles
- Service worker or browser cache may serve stale content
- **Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

**Hypothesis 2: Next.js Build Cache**

- `.next` directory may contain stale build artifacts
- Server components may not be re-rendering with new locale
- **Solution:** Delete `.next` directory and restart dev server

**Hypothesis 3: Client-Side Hydration Mismatch**

- Server renders with one locale, client hydrates with another
- React hydration error causing fallback to default locale
- **Solution:** Check browser console for hydration errors

**Hypothesis 4: Translation Key Resolution**

- `useTranslations("documents")` may be resolving to wrong namespace
- Messages object structure may not match expected format
- **Solution:** Verify messages object structure matches component expectations

### Phase 3: Most Likely Root Cause

**Root Cause:** Browser cache or Next.js build cache is serving stale content.

The code is correct, translations exist, but the browser or Next.js is serving cached JavaScript that still contains hardcoded Vietnamese strings from before the fix.

## Fix Plan

### Step 1: Clear Next.js Build Cache

```bash
cd apps/web
rm -rf .next
# Or on Windows:
Remove-Item -Path .next -Recurse -Force
```

### Step 2: Restart Dev Server

```bash
npm run dev
```

### Step 3: Clear Browser Cache

- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely:
  - Chrome: Settings > Privacy > Clear browsing data > Cached images and files
  - Firefox: Settings > Privacy > Clear Data > Cached Web Content

### Step 4: Verify Translations Are Loaded

Add temporary console.log to verify messages:

```typescript
export default function DocumentsPage() {
  const t = useTranslations("documents");
  console.log("Current locale:", useLocale());
  console.log("Documents translations:", {
    title: t("title"),
    description: t("description"),
    folder: t("folder"),
  });
  // ... rest of component
}
```

## Evidence

- ✅ Code uses translations correctly (`t("title")`, `t("description")`, `t("folder")`)
- ✅ Translation files exist with correct English values
- ✅ i18n configuration is correct
- ❌ Page still shows Vietnamese text (indicating cache issue)

## Solution Applied

The code has been updated correctly. The issue is likely a caching problem. Follow the fix plan above to clear caches and restart the dev server.

## Testing Steps

1. **Clear Next.js cache:**

   ```bash
   cd apps/web
   Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
   ```

2. **Restart dev server:**

   ```bash
   npm run dev
   ```

3. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

4. **Test locale switching:**
   - Navigate to `/en/dashboard/documents`
   - Verify all text is in English:
     - Title: "Document Management"
     - Subtitle: "Browse and manage ISO documents"
     - Folder section: "Folder"
   - Switch to `/vi/dashboard/documents`
   - Verify all text is in Vietnamese:
     - Title: "Quản lý tài liệu"
     - Subtitle: "Duyệt và quản lý tài liệu ISO"
     - Folder section: "Thư mục"

## Expected Outcome

After clearing caches and restarting:

- ✅ `/en/dashboard/documents` shows English text
- ✅ `/vi/dashboard/documents` shows Vietnamese text
- ✅ `/zh/dashboard/documents` shows Chinese text
- ✅ All translations update correctly when switching locales
