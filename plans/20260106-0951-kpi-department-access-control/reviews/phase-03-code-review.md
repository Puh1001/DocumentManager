# Code Review: Phase 3 - Frontend Filtering

**Review Date:** 2025-01-06  
**Reviewer:** AI Code Reviewer  
**Phase:** Phase 3: Frontend Filtering  
**Status:** ✅ Review Complete

---

## Summary

Phase 3 successfully implements frontend filtering for KPI department-based access control. The implementation follows React best practices, uses proper hooks for state management, and provides good user experience with appropriate error handling and UI states.

**Overall Assessment:** ✅ **APPROVED** with minor suggestions for improvement

**Key Strengths:**
- Clean helper functions with good separation of concerns
- Proper use of React hooks (useMemo, useAuth, useToast)
- Comprehensive error handling with user-friendly messages
- Good UX with appropriate UI states for different scenarios

**Areas for Improvement:**
- Interface duplication across files
- Missing dependency in useEffect
- Auto-create logic could be optimized
- Error handling patterns could be more consistent

---

## Critical Issues

### ✅ None

No critical issues found. The implementation is production-ready.

---

## Suggestions

### 1. **Type Safety: Extract Shared Interfaces** ⚠️ Medium Priority

**Issue:** `User` and `Department` interfaces are duplicated across multiple files.

**Current State:**
- `User` interface defined in:
  - `apps/web/src/lib/auth-context.tsx`
  - `apps/web/src/lib/kpi-access-helpers.ts`
- `Department` interface defined in:
  - `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`
  - `apps/web/src/lib/kpi-access-helpers.ts`

**Suggestion:** Create shared type definitions:

```typescript
// apps/web/src/lib/types/user.types.ts
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string | null;
  roles: string[];
}

// apps/web/src/lib/types/department.types.ts
export interface Department {
  id: string;
  name: string;
  code?: string;
}

// Update imports in all files
import type { User } from "@/lib/types/user.types";
import type { Department } from "@/lib/types/department.types";
```

**Impact:** Reduces duplication, improves maintainability, ensures type consistency

---

### 2. **React Hooks: Missing Dependency in useEffect** ⚠️ Medium Priority

**Issue:** `useEffect` for loading departments uses `toast` but doesn't include it in dependencies.

**Current Code:**
```typescript
useEffect(() => {
  const loadDepartments = async () => {
    // ... uses toast
  };
  loadDepartments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Missing toast dependency
```

**Suggestion:** Add `toast` to dependencies or use `useCallback`:

```typescript
useEffect(() => {
  const loadDepartments = async () => {
    // ... uses toast
  };
  loadDepartments();
}, [toast]); // Add toast dependency
```

**Impact:** Prevents stale closure issues, follows React best practices

---

### 3. **Performance: Optimize Auto-Create Logic** ⚠️ Low Priority

**Issue:** Auto-create logic runs on every `loadRecords` call, even when records already exist.

**Current Code:**
```typescript
// If no records, create first one (only if user can create)
if (recordsWithMetrics.length === 0 && canCreate) {
  try {
    // Creates record and metrics
  } catch (err) {
    // Silent failure for 403
  }
}
```

**Suggestion:** Add a flag to prevent repeated attempts:

```typescript
const [hasAttemptedAutoCreate, setHasAttemptedAutoCreate] = useState(false);

// In loadRecords
if (recordsWithMetrics.length === 0 && canCreate && !hasAttemptedAutoCreate) {
  setHasAttemptedAutoCreate(true);
  try {
    // Create logic
  } catch (err) {
    // Handle error
  }
}
```

**Impact:** Prevents unnecessary API calls, improves performance

---

### 4. **Error Handling: Extract Error Handler Function** 💡 Nice to Have

**Issue:** Error handling pattern is repeated multiple times with similar logic.

**Current Pattern (Repeated):**
```typescript
catch (err: unknown) {
  console.error(err);
  const apiError = err as { statusCode?: number; errorCode?: string; message?: string };
  if (apiError.statusCode === 403) {
    toast({
      title: "...",
      description: "...",
      variant: "destructive",
    });
  }
}
```

**Suggestion:** Create a reusable error handler:

```typescript
// In kpi page or shared utility
const handleApiError = (err: unknown, context: string) => {
  console.error(`Error in ${context}:`, err);
  const apiError = err as { statusCode?: number; errorCode?: string; message?: string };
  
  if (apiError.statusCode === 403) {
    const messages: Record<string, string> = {
      "kpi.access.denied.different_department": "Bạn không có quyền truy cập bộ môn này",
      "kpi.access.denied.no_department": "Bạn cần thuộc một bộ môn",
      "kpi.department.mismatch": "Bạn không thể thao tác với bộ môn khác",
    };
    
    toast({
      title: "Không có quyền truy cập",
      description: messages[apiError.errorCode || ""] || "Bạn không có quyền thực hiện thao tác này",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Lỗi",
      description: apiError.message || `Không thể ${context}`,
      variant: "destructive",
    });
  }
};

// Usage
catch (err) {
  handleApiError(err, "tải dữ liệu KPI");
}
```

**Impact:** Reduces code duplication, improves maintainability, consistent error messages

---

### 5. **UX: Add Loading States for Actions** 💡 Nice to Have

**Issue:** No loading indicators for create/update/delete operations.

**Suggestion:** Add loading states:

```typescript
const [isCreating, setIsCreating] = useState(false);

const handleAddNewTable = async () => {
  if (!selectedDepartmentId || !canCreate || isCreating) return;
  
  setIsCreating(true);
  try {
    // ... create logic
  } finally {
    setIsCreating(false);
  }
};

// In button
<Button
  disabled={!isEditMode || !canCreate || isCreating}
  onClick={handleAddNewTable}
>
  {isCreating ? "Đang tạo..." : t("addNewTable")}
</Button>
```

**Impact:** Better UX, prevents duplicate submissions

---

### 6. **Type Safety: Use Proper Error Types** 💡 Nice to Have

**Issue:** Error type casting uses `as` which bypasses type checking.

**Current:**
```typescript
const apiError = err as { statusCode?: number; errorCode?: string; message?: string };
```

**Suggestion:** Create proper error type or use type guard:

```typescript
// Define error type
interface ApiError extends Error {
  statusCode?: number;
  errorCode?: string;
}

// Type guard
function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    ("statusCode" in err || "errorCode" in err)
  );
}

// Usage
catch (err: unknown) {
  if (isApiError(err)) {
    if (err.statusCode === 403) {
      // Handle 403
    }
  }
}
```

**Impact:** Better type safety, prevents runtime errors

---

## Positive Feedback

### ✅ 1. Clean Helper Functions

The `kpi-access-helpers.ts` file provides well-structured, reusable functions:

```1:80:apps/web/src/lib/kpi-access-helpers.ts
/**
 * Helper functions for KPI access control
 */

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string | null;
  roles: string[];
}

interface Department {
  id: string;
  name: string;
  code?: string;
}

const ADMIN_ROLE = "admin";
const BOSS_ROLE = "boss";

/**
 * Check if user has full KPI access (admin or boss)
 */
export function hasFullKpiAccess(user: User | null): boolean {
  if (!user) return false;
  return user.roles.includes(ADMIN_ROLE) || user.roles.includes(BOSS_ROLE);
}

/**
 * Get user's department string
 */
export function getUserDepartment(user: User | null): string | null {
  return user?.department || null;
}

/**
 * Get accessible departments for user
 * - Admin/Boss: All departments
 * - Other users: Only their department (if exists)
 */
export function getAccessibleDepartments(
  user: User | null,
  allDepartments: Department[]
): Department[] {
  if (!user) return [];

  // Admin/Boss: Show all departments
  if (hasFullKpiAccess(user)) {
    return allDepartments;
  }

  // Regular users: Only their department
  const userDepartment = getUserDepartment(user);
  if (!userDepartment) {
    return [];
  }

  // Match by code first, then by name
  const matched = allDepartments.find(
    (dept) =>
      dept.code?.toLowerCase() === userDepartment.toLowerCase() ||
      dept.name.toLowerCase() === userDepartment.toLowerCase()
  );

  return matched ? [matched] : [];
}

/**
 * Check if user can create KPI records
 */
export function canCreateKpi(user: User | null): boolean {
  if (!user) return false;
  // Admin/Boss can always create
  if (hasFullKpiAccess(user)) return true;
  // Regular users need a department
  return !!getUserDepartment(user);
}
```

**Strengths:**
- Clear function names and documentation
- Proper null handling
- Good separation of concerns
- Easy to test

### ✅ 2. Proper Use of React Hooks

The component correctly uses React hooks:

```126:132:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
  // Filter departments based on user access
  const departments = useMemo(() => {
    return getAccessibleDepartments(user, allDepartments);
  }, [user, allDepartments]);

  // Check if user can create KPIs
  const canCreate = canCreateKpi(user);
```

**Strengths:**
- `useMemo` prevents unnecessary recalculations
- Proper dependency arrays
- Clean hook usage

### ✅ 3. Comprehensive Error Handling

Error handling covers all scenarios with user-friendly messages:

```311:325:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
      } catch (err: unknown) {
        console.error(err);
        const apiError = err as { statusCode?: number; errorCode?: string; message?: string };
        if (apiError.statusCode === 403) {
          toast({
            title: "Không có quyền truy cập",
            description:
              apiError.errorCode === "kpi.access.denied.different_department"
                ? "Bạn không có quyền xem KPI của bộ môn này"
                : "Bạn không có quyền truy cập dữ liệu KPI",
            variant: "destructive",
          });
          setRecords([]);
        } else {
          setError("Không tải được dữ liệu KPI");
        }
      } finally {
        setLoading(false);
      }
```

**Strengths:**
- Handles 403 errors specifically
- Provides context-specific error messages
- Uses toast notifications for better UX
- Graceful degradation (empty records on 403)

### ✅ 4. Good UX with Conditional UI

The UI adapts based on user permissions:

```771:787:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
              {departments.length > 1 || hasFullKpiAccess(user) ? (
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : departments.length === 1 ? (
                <span className="text-sm font-medium">
                  {departments[0].name}
                </span>
              ) : null}
```

**Strengths:**
- Hides dropdown when only one department (non-admin)
- Shows department name directly for single department
- Clean conditional rendering

### ✅ 5. Proper Authorization Checks

The component correctly checks permissions before allowing actions:

```552:553:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
  const handleAddNewTable = async () => {
    if (!selectedDepartmentId || !canCreate) return;
```

```1097:1101:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddNewTable}
                        disabled={!isEditMode || !canCreate}
                        title={
                          !canCreate
                            ? "Bạn không có quyền tạo KPI mới"
                            : undefined
                        }
```

**Strengths:**
- Prevents unauthorized actions at UI level
- Provides helpful tooltips
- Backend still enforces (defense in depth)

### ✅ 6. Appropriate Empty States

The component shows helpful messages for different scenarios:

```737:760:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
      {!departments.length ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">KPI</h1>
          {!user ? (
            <p className="text-muted-foreground">Đang tải thông tin người dùng...</p>
          ) : !getUserDepartment(user) ? (
            <p className="text-muted-foreground">
              Bạn chưa được gán vào bộ môn nào. Vui lòng liên hệ quản trị viên để được gán vào bộ môn.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Không có bộ môn nào. Vui lòng tạo bộ môn trước.
            </p>
          )}
        </div>
      ) : (
```

**Strengths:**
- Different messages for different scenarios
- Helpful guidance for users
- Good UX for edge cases

---

## Code Quality Metrics

| Metric               | Status       | Notes                                                    |
| -------------------- | ------------ | -------------------------------------------------------- |
| **Type Safety**      | ⚠️ Good      | Some type casting with `as`, interface duplication       |
| **Error Handling**   | ✅ Excellent | Comprehensive error handling with user-friendly messages |
| **Performance**      | ✅ Good      | useMemo used correctly, minor optimization opportunities  |
| **Code Duplication** | ⚠️ Minor     | Error handling pattern repeated, interface duplication   |
| **Security**         | ✅ Excellent | Frontend filtering is UX only, backend enforces          |
| **Maintainability**  | ✅ Good      | Clean code, good separation, minor improvements needed   |
| **UX**               | ✅ Excellent | Good empty states, error messages, conditional UI         |

---

## Compliance Check

### ✅ Code Standards (`./docs/code-standards.md`)

- ✅ File naming: `kebab-case.ts` ✓
- ✅ Component structure: Proper React component ✓
- ✅ Hooks usage: Correct use of React hooks ✓
- ⚠️ Type safety: Some `as` casting (suggestion provided)
- ✅ Error handling: Comprehensive error handling ✓

### ✅ Security Standards

- ✅ Frontend filtering is UX enhancement only ✓
- ✅ Backend enforces authorization (defense in depth) ✓
- ✅ No sensitive data exposed ✓
- ✅ Proper error messages (no information leakage) ✓

### ✅ UX Standards

- ✅ Appropriate empty states ✓
- ✅ User-friendly error messages ✓
- ✅ Conditional UI based on permissions ✓
- ✅ Loading states (for main data) ✓
- ⚠️ Loading states for actions: Not implemented (suggestion provided)

---

## Recommendations Summary

### Must Fix (Before Production)

- None

### Should Fix (Recommended)

1. **Extract shared interfaces** (Suggestion #1) - Reduce duplication
2. **Fix useEffect dependency** (Suggestion #2) - Follow React best practices

### Nice to Have (Future Improvements)

3. **Optimize auto-create logic** (Suggestion #3)
4. **Extract error handler function** (Suggestion #4)
5. **Add loading states for actions** (Suggestion #5)
6. **Use proper error types** (Suggestion #6)

---

## Conclusion

Phase 3 implementation is **production-ready** with excellent UX, comprehensive error handling, and proper React patterns. The suggestions provided are optimizations and improvements that can be implemented incrementally.

**Recommendation:** ✅ **APPROVE** - Proceed to Phase 4 (Testing & Validation) or production deployment

---

## Review Checklist

- [x] Code follows project standards
- [x] Security vulnerabilities checked
- [x] Performance implications analyzed
- [x] Error handling verified
- [x] UX patterns reviewed
- [x] Suggestions provided
- [x] Positive feedback documented

---

**Next Steps:**

1. Consider implementing Suggestion #1 (Shared interfaces) for better maintainability
2. Fix useEffect dependency (Suggestion #2) before production
3. Proceed to Phase 4: Testing & Validation (if needed)

