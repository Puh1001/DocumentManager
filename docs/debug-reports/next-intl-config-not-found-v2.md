# Debug Report: next-intl Config File Not Found (v2)

**Date:** 2025-01-22  
**Error:** `Couldn't find next-intl config file. Please follow the instructions at https://next-intl.dev/docs/getting-started/app-router`  
**Location:** `apps/web/src/app/[locale]/layout.tsx:26` (getMessages call)

## Problem Summary

Next.js dev server cannot find the next-intl configuration file, causing runtime errors when `getMessages()` is called in the locale layout.

## Root Cause Investigation

### Phase 1: Evidence Gathering

1. **File Structure:**
   - Config file exists: `apps/web/i18n/request.ts` ✅
   - File exports valid `getRequestConfig` ✅
   - Routing config exists: `apps/web/i18n/routing.ts` ✅
   - Middleware configured: `apps/web/middleware.ts` ✅

2. **Configuration Files:**
   - `next.config.js`: Missing next-intl plugin configuration ❌
   - `package.json`: next-intl v4.6.1 installed ✅
   - `tsconfig.json`: Standard Next.js config ✅

3. **Error Context:**
   - Error occurs at `layout.tsx:26` when calling `getMessages()`
   - Error message indicates next-intl cannot locate config file
   - Dev server running with Next.js 14.0.4

### Phase 2: Pattern Analysis

**Expected Pattern (next-intl v4):**

- Config file at: `i18n/request.ts` (project root) ✅
- `next.config.js` must use `createNextIntlPlugin()` to wrap config ❌
- Plugin tells Next.js where to find the config file

**Current State:**

- Config file exists in correct location ✅
- `next.config.js` does NOT use the plugin ❌
- Next.js doesn't know to look for the config file

### Phase 3: Root Cause

**Root Cause:** `next.config.js` is missing the next-intl plugin wrapper.

Next-intl v4 requires the plugin to be configured in `next.config.js` to:

1. Tell Next.js where to find the config file
2. Enable proper module resolution
3. Integrate with Next.js build system

Without the plugin, Next.js has no way to know about the `i18n/request.ts` file.

### Phase 4: Fix Plan

1. **Update `next.config.js`:**
   - Import `createNextIntlPlugin` from 'next-intl/plugin'
   - Wrap existing config with the plugin
   - Plugin will automatically find `i18n/request.ts` (default path)

2. **Verification Steps:**
   - Restart dev server
   - Clear `.next` cache if needed
   - Verify error is resolved
   - Test locale switching

## Evidence

- ✅ Config file exists: `apps/web/i18n/request.ts`
- ✅ Config file has valid export
- ✅ Middleware properly configured
- ❌ `next.config.js` missing plugin wrapper
- ✅ next-intl v4.6.1 installed

## Solution

Update `next.config.js` to include the next-intl plugin:

```javascript
const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@iso-docs/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010"}/api/:path*`,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
```

## Next Steps

1. Apply fix to `next.config.js`
2. Restart dev server
3. Clear cache: `rm -rf apps/web/.next`
4. Verify error resolved
5. Test locale functionality
