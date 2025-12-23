# Researcher 01: i18n Solutions for Next.js 14

**Date:** 2025-12-23  
**Researcher:** Main Agent  
**Focus:** i18n library comparison and Next.js 14 App Router compatibility

## Executive Summary

For Next.js 14 App Router applications, **next-intl** is the recommended i18n solution due to native App Router support, Server Component compatibility, and TypeScript integration.

## Library Comparison

### 1. next-intl (Recommended)

**Pros:**

- ✅ Built specifically for Next.js App Router
- ✅ Supports Server Components and Client Components
- ✅ TypeScript-first with type-safe translations
- ✅ Rich formatting (dates, numbers, currencies)
- ✅ Nested translation keys
- ✅ Automatic locale detection
- ✅ SSR/SSG support
- ✅ Lightweight and performant

**Cons:**

- ⚠️ Smaller ecosystem than react-i18next
- ⚠️ Newer library (less community resources)

**Installation:**

```bash
npm install next-intl
```

**Key Features:**

- Route-based locale handling (`/[locale]/...`)
- Translation files in JSON/Messages format
- `useTranslations()` hook for Client Components
- `getTranslations()` for Server Components
- Built-in date/number formatting

### 2. react-i18next

**Pros:**

- ✅ Mature ecosystem
- ✅ Extensive plugin support
- ✅ Good documentation
- ✅ Dynamic translations

**Cons:**

- ⚠️ Requires manual SSR setup for App Router
- ⚠️ Not optimized for Next.js 14 App Router
- ⚠️ More complex configuration

### 3. next-i18next

**Pros:**

- ✅ Simple setup for Pages Router

**Cons:**

- ❌ **Not compatible with App Router**
- ❌ Only works with Pages Router (Next.js 12 and earlier)

## Recommendation

**Use next-intl** for this project because:

1. Native App Router support (no workarounds)
2. Server Component compatibility (critical for Next.js 14)
3. TypeScript type safety
4. Better performance with code splitting
5. Simpler API for developers

## Implementation Approach

### Directory Structure

```
apps/web/
├── messages/
│   ├── en.json
│   ├── vi.json
│   └── zh.json
├── i18n/
│   ├── request.ts
│   └── config.ts
└── middleware.ts
```

### Key Configuration

- Locales: `en`, `vi`, `zh`
- Default locale: `vi` (Vietnamese)
- Locale detection: Browser headers + user preference
- Route structure: `/[locale]/dashboard/...`

## References

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js 14 i18n Guide](https://nextjs.org/docs/pages/guides/internationalization)
- [App Router i18n Best Practices](https://dev.to/fabrikapp/implementing-internationalization-i18n-in-nextjs-14-using-app-router-3mic)

## Unresolved Questions

None - next-intl is clearly the best choice for Next.js 14 App Router.
