# Debug Report: React Hydration Error - Toaster Component

**Date:** 2025-01-22  
**Error:** `Hydration failed because the initial UI does not match what was rendered on the server`  
**Location:** Toaster component in layout hierarchy

## Problem Summary

React hydration error occurs because the server-rendered HTML doesn't match the client-side React tree. The error originates from the Toaster component (Radix UI toast) in the component hierarchy.

## Root Cause Investigation

### Phase 1: Evidence Gathering

1. **Error Details:**
   - Error: "Hydration failed because the initial UI does not match what was rendered on the server"
   - Warning: "Expected server HTML to contain a matching <div> in <body>"
   - Component Stack: Toaster → AuthProvider → body → html

2. **Layout Structure:**
   - `apps/web/src/app/layout.tsx`: Root layout with `<html><body>` containing `<AuthProvider>` and `<Toaster />`
   - `apps/web/src/app/[locale]/layout.tsx`: Locale layout ALSO with `<html><body>` containing `<NextIntlClientProvider>`

3. **File Analysis:**
   - `toaster.tsx`: Client component (`'use client'`) using Radix UI Toast
   - `auth-context.tsx`: Client component using `localStorage` (client-only API)

### Phase 2: Pattern Analysis

**Expected Pattern (Next.js App Router):**
- Only ONE layout should have `<html><body>` tags (root layout)
- Nested layouts should NOT have `<html><body>`
- Client components that use browser APIs should be properly handled

**Current State:**
- ❌ TWO layouts both have `<html><body>` tags
- ❌ Nested HTML structure: Root layout's `<html><body>` → Locale layout's `<html><body>`
- ❌ Invalid HTML structure causes hydration mismatch

### Phase 3: Root Cause

**Root Cause:** Nested `<html><body>` tags in layouts.

1. **Root Layout** (`app/layout.tsx`):
   ```tsx
   <html>
     <body>
       <AuthProvider>
         {children}  // This is [locale]/layout.tsx
         <Toaster />
       </AuthProvider>
     </body>
   </html>
   ```

2. **Locale Layout** (`app/[locale]/layout.tsx`):
   ```tsx
   <html lang={locale}>  // ❌ NESTED HTML!
     <body>              // ❌ NESTED BODY!
       <NextIntlClientProvider>
         {children}
       </NextIntlClientProvider>
     </body>
   </html>
   ```

**Why This Causes Hydration Error:**
- Server renders: Root `<html><body>` → Locale `<html><body>` (invalid nesting)
- Client React expects: Different structure
- Radix UI Toast tries to render portal, but HTML structure is invalid
- Result: Hydration mismatch

### Phase 4: Fix Plan

1. **Remove `<html><body>` from locale layout:**
   - Locale layout should only wrap children, not create new HTML structure
   - Move `lang` attribute to root layout (but we need locale...)

2. **Restructure layouts:**
   - Option A: Keep root layout simple, move everything to locale layout
   - Option B: Keep providers in root, locale layout just wraps with NextIntlClientProvider
   - Option C: Use a single layout that handles both

3. **Handle locale-specific attributes:**
   - `lang` attribute needs locale value
   - Can be set dynamically in root layout or use a different approach

## Evidence

- ✅ Root layout has `<html><body>` with `<AuthProvider>` and `<Toaster />`
- ✅ Locale layout ALSO has `<html><body>` with `<NextIntlClientProvider>`
- ✅ Toaster is a client component using Radix UI
- ✅ AuthProvider uses `localStorage` (client-only)
- ❌ Nested HTML structure is invalid

## Solution

**Best Approach:** Restructure so only root layout has `<html><body>`, and locale layout just wraps children.

1. **Update root layout** to handle locale (if possible) or keep it simple
2. **Update locale layout** to remove `<html><body>`, just wrap with providers
3. **Move providers** appropriately to avoid duplication

**Recommended Structure:**
- Root layout: Basic structure, providers that don't need locale
- Locale layout: Wraps with NextIntlClientProvider, no HTML tags
- Or: Single layout that handles everything

## Next Steps

1. ✅ Remove `<html><body>` from `[locale]/layout.tsx`
2. ✅ Restructure provider hierarchy
3. ✅ Ensure `lang` attribute is set correctly
4. ⏳ Test hydration error is resolved

## Fix Applied

### Changes Made:

1. **Locale Layout** (`app/[locale]/layout.tsx`):
   - ❌ Removed: `<html lang={locale}><body>` tags
   - ✅ Added: `<AuthProvider>` and `<Toaster />` wrappers
   - ✅ Now: Just wraps children with providers, no HTML structure

2. **Root Layout** (`app/layout.tsx`):
   - ✅ Kept: `<html><body>` structure (only one in app)
   - ✅ Set: `lang={routing.defaultLocale}` for default locale
   - ✅ Removed: `<AuthProvider>` and `<Toaster />` (moved to locale layout)

### Structure After Fix:

```
Root Layout (app/layout.tsx):
  <html lang="vi">
    <body>
      {children}  // This is [locale]/layout.tsx

Locale Layout (app/[locale]/layout.tsx):
  <NextIntlClientProvider>
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  </NextIntlClientProvider>
```

**Result:** No nested HTML tags, proper provider hierarchy, hydration should work correctly.

