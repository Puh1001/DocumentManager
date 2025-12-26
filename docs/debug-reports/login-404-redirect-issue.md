# Debug Report: 404 Error khi Redirect đến /login

**Date:** 2025-12-25  
**Status:** 🔍 Root Cause Identified  
**Priority:** HIGH

---

## Tóm Tắt Vấn Đề

**Lỗi được báo cáo:**

Khi bị đẩy ra `/login` (khi authentication fail hoặc token expired), browser hiển thị lỗi 404 Not Found.

**Error:**

```
GET https://docs.bestpacific.vn/login 404 (Not Found)
```

**URL hiển thị:** `https://docs.bestpacific.vn/login`

---

## Phân Tích Nguyên Nhân (5 Whys)

### Why 1: Tại sao `/login` trả về 404?

**Trả lời:** Route `/login` không tồn tại. App sử dụng next-intl với locale routing, nên route phải có locale prefix: `/[locale]/login`.

**Bằng chứng:**

**Login page location:**

- File: `apps/web/src/app/[locale]/login/page.tsx`
- Route đúng: `/[locale]/login` (ví dụ: `/en/login`, `/vi/login`)

**Route sai:**

- Code redirect đến: `/login` (không có locale prefix)
- Route này không tồn tại → 404

### Why 2: Tại sao code redirect đến `/login` thay vì `/[locale]/login`?

**Trả lời:** Trong `api.ts`, khi refresh token fail, code hardcode redirect đến `/login` mà không include locale.

**Bằng chứng:**

**File:** `apps/web/src/lib/api.ts:85-94`

```85:94:apps/web/src/lib/api.ts
        // Refresh failed, clear tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          // Optionally redirect to login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";  // ❌ SAI: Không có locale
          }
        }
```

**Vấn đề:**

- Hardcode `/login` thay vì `/${locale}/login`
- Không lấy locale từ current pathname hoặc cookie

### Why 3: Tại sao không sử dụng next-intl navigation helpers?

**Trả lời:** Code sử dụng `window.location.href` thay vì next-intl's `redirect` hoặc `useRouter` từ `next-intl/navigation`.

**Bằng chứng:**

**File:** `apps/web/i18n/routing.ts`

```1:15:apps/web/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "vi", "zh"],

  // Used when no locale matches
  defaultLocale: "en",
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

**Có sẵn:** `redirect` và `useRouter` từ next-intl nhưng không được sử dụng trong `api.ts`.

### Why 4: Tại sao middleware không tự động redirect `/login` đến `/[locale]/login`?

**Trả lời:** Middleware next-intl chỉ handle routes matching matcher pattern, nhưng có thể không handle redirect từ client-side (`window.location.href`).

**Bằng chứng:**

**File:** `apps/web/middleware.ts`

```1:15:apps/web/middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  // Exclude API routes, Next.js internals, and static files
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
```

**Vấn đề:**

- Middleware chỉ chạy trên server-side
- Client-side redirect (`window.location.href = "/login"`) không trigger middleware
- Browser trực tiếp request `/login` → 404

### Why 5: Nguyên nhân gốc rễ là gì?

**Nguyên nhân gốc rễ:** Code redirect trong `api.ts` không tương thích với next-intl locale routing. Hardcode `/login` thay vì sử dụng locale-aware navigation.

**Các yếu tố đóng góp:**

1. Hardcode path `/login` không có locale prefix
2. Không sử dụng next-intl navigation helpers
3. Client-side redirect không trigger middleware
4. Không extract locale từ current pathname hoặc cookie

---

## Bằng Chứng

### 1. Code Analysis

**File:** `apps/web/src/lib/api.ts:85-94`

```typescript
// Refresh failed, clear tokens and redirect to login
if (typeof window !== "undefined") {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  // Optionally redirect to login page
  if (window.location.pathname !== "/login") {
    window.location.href = "/login"; // ❌ SAI
  }
}
```

**Vấn đề:**

- Hardcode `/login` không có locale
- Không extract locale từ pathname hiện tại

**Route structure:**

- Login page: `apps/web/src/app/[locale]/login/page.tsx`
- Route đúng: `/[locale]/login` (ví dụ: `/en/login`, `/vi/login`)
- Route sai: `/login` → 404

### 2. Correct Redirect Pattern

**File:** `apps/web/src/app/[locale]/dashboard/layout.tsx:19-23`

```19:23:apps/web/src/app/[locale]/dashboard/layout.tsx
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/${locale}/login`);  // ✅ ĐÚNG: Có locale
    }
  }, [user, isLoading, router, locale]);
```

**Đúng:** Sử dụng `useLocale()` và `router.push()` với locale prefix.

### 3. Next-intl Navigation Helpers

**File:** `apps/web/i18n/routing.ts`

```typescript
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

**Có sẵn:** Navigation helpers từ next-intl nhưng không được sử dụng trong `api.ts`.

---

## Giải Pháp

### Fix 1: Extract Locale từ Pathname và Redirect Đúng (CRITICAL)

**File:** `apps/web/src/lib/api.ts`

**Thay đổi:**

```typescript
private async doRefresh(refreshToken: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, clear tokens and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        // Extract locale from current pathname or use default
        const pathname = window.location.pathname;
        const localeMatch = pathname.match(/^\/(en|vi|zh)/);
        const locale = localeMatch ? localeMatch[1] : "en"; // Default to 'en'

        // Redirect to locale-aware login page
        if (!pathname.includes("/login")) {
          window.location.href = `/${locale}/login`;
        }
      }
      throw new Error("Refresh token expired or invalid");
    }

    // ... rest of the code
  } catch (error) {
    // Clear tokens on any error
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
    throw error;
  }
}
```

**Kết quả:**

- Extract locale từ current pathname
- Redirect đến `/${locale}/login` thay vì `/login`
- Fallback về `en` nếu không tìm thấy locale

### Fix 2: Sử dụng Next-intl Navigation (Alternative - Better)

**Option:** Import và sử dụng `redirect` từ `next-intl/navigation`:

```typescript
import { redirect } from "../../i18n/routing";

// In doRefresh:
if (!response.ok) {
  // ... clear tokens ...
  redirect("/login"); // next-intl sẽ tự động thêm locale
}
```

**Lưu ý:** `redirect` từ next-intl chỉ hoạt động trong Server Components, không hoạt động trong client-side code. Cần dùng `window.location.href` với locale.

### Fix 3: Tạo Helper Function để Get Locale

**File:** `apps/web/src/lib/utils.ts` (hoặc tạo mới)

```typescript
export function getLocaleFromPathname(pathname: string): string {
  const localeMatch = pathname.match(/^\/(en|vi|zh)/);
  return localeMatch ? localeMatch[1] : "en"; // Default to 'en'
}

export function getLoginPath(locale?: string): string {
  const currentLocale =
    locale || getLocaleFromPathname(window.location.pathname);
  return `/${currentLocale}/login`;
}
```

**Sử dụng:**

```typescript
window.location.href = getLoginPath();
```

---

## Kế Hoạch Thực Hiện

### Phase 1: Immediate Fix (CRITICAL)

1. ✅ Sửa redirect trong `api.ts` để extract locale từ pathname
2. ✅ Redirect đến `/${locale}/login` thay vì `/login`
3. ✅ Test với các locales khác nhau (en, vi, zh)

### Phase 2: Testing

1. Test redirect khi refresh token fail
2. Test với các locales khác nhau
3. Verify không còn 404 errors

### Phase 3: Code Improvement (Optional)

1. Tạo helper function để get locale
2. Refactor để reuse logic
3. Add unit tests

---

## Kết Luận

**Nguyên nhân chính:** Code redirect trong `api.ts` hardcode `/login` không có locale prefix, trong khi app sử dụng next-intl với locale routing (`/[locale]/login`).

**Giải pháp ưu tiên:** Extract locale từ current pathname và redirect đến `/${locale}/login` thay vì `/login`.

**Impact:** Sau khi fix, redirect sẽ hoạt động đúng với locale routing và không còn 404 errors.
