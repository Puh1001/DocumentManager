e# Debug Report: Sidebar Không Hiển Thị Pages

**Date:** 2025-12-26  
**Issue:** Admin không thấy departments, kpi, maintenance, permissions, users trong sidebar

---

## Root Cause Analysis

### Vấn Đề: Next.js App Router Module Loading

**Page Registry là in-memory array:**

```typescript
// page-registry.ts
const registeredPages: PageMetadata[] = []; // Empty array initially
```

**Pages register khi module được import:**

```typescript
// users/page.tsx
export const pageMetadata = {...};
registerPage(pageMetadata); // Called at module level
```

**Vấn đề với Next.js App Router:**

- Next.js lazy-loads pages (code splitting)
- `registerPage()` chỉ được execute khi page module được import
- Nếu user chưa navigate đến page, module chưa được load
- `usePages()` hook gọi `getAllPages()` ngay khi sidebar mount
- **Result:** `registeredPages` array vẫn empty → sidebar không có pages

### Flow Hiện Tại

```
1. User login → Sidebar render
2. Sidebar calls usePages() hook
3. usePages() calls getAllPages()
4. getAllPages() returns registeredPages array
5. registeredPages = [] (empty) ❌
6. Pages chưa được import → registerPage() chưa được execute
7. Sidebar shows empty navigation
```

### Expected Flow

```
1. All pages should be imported/registered BEFORE sidebar renders
2. OR pages should be registered in a central file that's always loaded
3. OR use dynamic import to force load all pages
```

---

## Verification Steps

### 1. Check Browser Console

```javascript
// In browser console
// Check if pages are registered
import { getAllPages } from "@/lib/page-registry";
console.log(getAllPages());
// Should show array of pages, not empty array
```

### 2. Check Network Tab

- Check if page modules are being loaded
- Check if `registerPage()` is being called

### 3. Add Debug Logging

Add console.log in sidebar to check:

- `pages` array length
- `ability` state
- `canAccess` results

---

## Solutions

### Solution 1: Force Import All Pages (Recommended)

Create a central file that imports all pages to ensure they're registered:

```typescript
// apps/web/src/lib/page-registry-init.ts
// This file forces all pages to be imported and registered

// Import all dashboard pages to trigger registerPage() calls
import "@/app/[locale]/dashboard/users/page";
import "@/app/[locale]/dashboard/departments/page";
import "@/app/[locale]/dashboard/kpi/page";
import "@/app/[locale]/dashboard/maintenance/page";
import "@/app/[locale]/dashboard/permissions/page";

// Export nothing, just side effects
```

Then import this file in layout or sidebar:

```typescript
// apps/web/src/components/layout/sidebar.tsx
import "@/lib/page-registry-init"; // Force load all pages
```

**Pros:**

- Simple and straightforward
- Ensures all pages are registered
- Works with Next.js App Router

**Cons:**

- Slightly increases initial bundle size
- Need to manually add new pages

### Solution 2: Register Pages in Layout

Move page registration to layout file that's always loaded:

```typescript
// apps/web/src/app/[locale]/dashboard/layout.tsx
import { registerPage } from "@/lib/page-registry";

// Register all pages here
registerPage({
  path: "/dashboard/users",
  name: "User Management",
  module: "User",
  action: "view",
  icon: "Users",
  order: 5,
});
// ... register all other pages
```

**Pros:**

- Centralized registration
- Always loaded

**Cons:**

- Duplicates metadata
- Not DRY (metadata defined in 2 places)

### Solution 3: Use Dynamic Import in usePages

Modify `usePages` hook to dynamically import all pages:

```typescript
// apps/web/src/hooks/use-pages.ts
export function usePages() {
  const [pages, setPages] = useState<PageMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamically import all pages to trigger registration
    Promise.all([
      import("@/app/[locale]/dashboard/users/page"),
      import("@/app/[locale]/dashboard/departments/page"),
      import("@/app/[locale]/dashboard/kpi/page"),
      import("@/app/[locale]/dashboard/maintenance/page"),
      import("@/app/[locale]/dashboard/permissions/page"),
    ]).then(() => {
      // After all pages are imported, get registered pages
      const allPages = getAllPages();
      setPages(allPages);
      setLoading(false);
    });
  }, []);

  return { pages, loading };
}
```

**Pros:**

- Dynamic loading
- Works with code splitting

**Cons:**

- More complex
- Async loading (need loading state)

### Solution 4: Use Next.js Route Metadata (Future)

Use Next.js built-in route metadata system (if available in future versions).

---

## Recommended Fix

**Solution 1** is recommended because:

- Simple and reliable
- Works immediately
- Easy to maintain
- Minimal code changes

### Implementation

1. Create `apps/web/src/lib/page-registry-init.ts`
2. Import all dashboard pages
3. Import this file in sidebar or layout

---

## Testing

After fix:

1. Refresh browser
2. Login as admin
3. Check sidebar → Should show all pages
4. Check browser console → Should see pages registered
5. Navigate to pages → Should work correctly

---

## Additional Notes

- This is a common issue with Next.js App Router and module-level side effects
- Page registry pattern works better with server-side rendering or static generation
- For client-side rendering, need to ensure modules are loaded before use

---

**Next Steps:**

1. Implement Solution 1 (force import all pages)
2. Test sidebar shows all pages
3. Verify navigation works correctly
