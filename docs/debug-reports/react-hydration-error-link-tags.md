# Debug Report: React Hydration Error - Link Tags in Head

**Date:** 2025-01-26  
**Error:** `Hydration failed because the initial UI does not match what was rendered on the server`  
**Warning:** `Expected server HTML to contain a matching <link> in <head>`  
**Location:** `apps/web/src/app/[locale]/layout.tsx`

## Problem Summary

React hydration error occurs because manual `<head>` and `<link>` tags are added in the locale layout. In Next.js App Router, the `<head>` element is automatically managed by Next.js, and manually adding it causes server/client HTML mismatch.

## Root Cause Investigation

### Phase 1: Evidence Gathering

1. **Error Details:**
   - Error: "Hydration failed because the initial UI does not match what was rendered on the server"
   - Warning: "Expected server HTML to contain a matching <link> in <head>"
   - Component Stack: `link → head → html`

2. **File Analysis:**
   - `apps/web/src/app/[locale]/layout.tsx`: Contains manual `<head>` with Google Fonts `<link>` tags (lines 32-36)
   - Manual `<head>` tag
   - Three `<link>` tags for Google Fonts (preconnect and stylesheet)

3. **Next.js App Router Behavior:**
   - Next.js App Router automatically manages `<head>` element
   - Manual `<head>` tags in layouts cause hydration mismatches
   - Server renders the manual `<head>`, but client expects Next.js-managed head

### Phase 2: Pattern Analysis

**Expected Pattern (Next.js App Router):**

- ❌ DO NOT manually add `<head>` tags in layouts
- ✅ Use `metadata` export for head content
- ✅ Use `next/font` for font optimization (recommended)
- ✅ Or use `metadata.other` for custom links

**Current State:**

- ❌ Manual `<head>` tag in locale layout
- ❌ Manual `<link>` tags for Google Fonts
- ❌ Causes server/client HTML mismatch

### Phase 3: Root Cause

**Root Cause:** Manual `<head>` and `<link>` tags in Next.js App Router layout.

**Why This Causes Hydration Error:**

1. Server renders: Manual `<head>` with `<link>` tags
2. Client React expects: Next.js-managed `<head>` (different structure)
3. Mismatch: Server HTML doesn't match client expectations
4. Result: Hydration error

**Code Location:**

```32:36:apps/web/src/app/[locale]/layout.tsx
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
```

## Evidence

- ✅ Locale layout contains manual `<head>` tag
- ✅ Three `<link>` tags for Google Fonts in manual `<head>`
- ✅ Next.js App Router manages `<head>` automatically
- ✅ Manual `<head>` causes hydration mismatch
- ✅ Error specifically mentions missing `<link>` in `<head>`

## Solution

**Best Approach:** Remove manual `<head>` tag and use Next.js metadata API for font links.

### Option 1: Use Metadata API (Recommended for External Fonts)

Add font links via `metadata.other` or use `next/font` for better optimization.

### Option 2: Use next/font (Best Performance)

Use `next/font/google` for automatic optimization, self-hosting, and zero layout shift.

### Fix Plan

1. **Remove manual `<head>` tag** from locale layout
2. **Add font links via metadata API** or use `next/font`
3. **Test** hydration error is resolved

## Fix Applied

### Changes Made:

1. **Locale Layout** (`app/[locale]/layout.tsx`):
   - ❌ Removed: Manual `<head>` tag with `<link>` tags (lines 32-36)
   - ✅ Result: Next.js manages head automatically, no hydration mismatch

2. **Global CSS** (`app/globals.css`):
   - ✅ Added: Font import via CSS `@import` at the top of the file
   - ✅ Fonts loaded via CSS instead of manual HTML links

### Code Changes:

**Before:**

```tsx
// app/[locale]/layout.tsx
<html lang={locale}>
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
```

**After:**

```tsx
// app/[locale]/layout.tsx
<html lang={locale}>
  <body>
```

```css
/* app/globals.css */
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap");
```

### Result:

- ✅ No manual `<head>` tag in layout
- ✅ Fonts loaded via CSS `@import`
- ✅ Next.js manages `<head>` automatically
- ✅ No hydration mismatch
- ✅ Fonts still available for `.font-cyber` class

**Note:** CSS `@import` is a simple fix. For better performance, consider using `next/font/google` in the future, which provides automatic optimization, self-hosting, and zero layout shift.
