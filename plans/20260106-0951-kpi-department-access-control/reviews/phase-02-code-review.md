# Code Review: Phase 2 - Backend Authorization

**Review Date:** 2025-01-06  
**Reviewer:** AI Code Reviewer  
**Phase:** Phase 2: Backend Authorization  
**Status:** ✅ Review Complete

---

## Summary

Phase 2 successfully implements department-based authorization for KPI management. The implementation follows NestJS best practices, maintains clean separation of concerns, and includes comprehensive test coverage. Authorization logic is consistently applied across all CRUD operations for both KPI records and metrics.

**Overall Assessment:** ✅ **APPROVED** with minor suggestions for optimization

**Key Strengths:**

- Clean authorization logic with proper helper methods
- Comprehensive unit test coverage
- Consistent error handling using CustomException
- Proper separation between service and controller layers
- Successfully resolved circular dependency issue

**Areas for Improvement:**

- Performance optimization for user department resolution
- Missing integration tests for authorization scenarios
- Potential code duplication in controllers

---

## Critical Issues

### ✅ None

No critical issues found. The implementation is production-ready.

---

## Suggestions

### 1. **Performance: Optimize User Department Resolution** ⚠️ Medium Priority

**Issue:** Each controller method calls `getUserWithDepartment()`, which may query the database on every request.

**Current Implementation:**

```typescript
// In controllers - repeated in every method
const user = await this.userDepartmentResolver.getUserWithDepartment(
  req.user.id
);
```

**Suggestion 1: Extract to Guard/Interceptor** (Recommended)

```typescript
// Create a custom guard or interceptor
@Injectable()
export class UserDepartmentGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userWithDept =
      await this.userDepartmentResolver.getUserWithDepartment(request.user.id);
    request.userWithDepartment = userWithDept; // Attach to request
    return true;
  }
}

// Usage in controller
@UseGuards(JwtAuthGuard, UserDepartmentGuard)
@Controller("kpi/records")
export class KpiRecordController {
  findAll(@Request() req: AuthenticatedRequest) {
    return this.kpiRecordService.findAll({}, req.userWithDepartment);
  }
}
```

**Suggestion 2: Cache in JWT/Session** (Alternative)

- Include department info in JWT payload (refresh on role/department change)
- Cache in Redis with TTL

**Impact:** Reduces database queries from N (per endpoint call) to 1 (per request)

---

### 2. **Testing: Add Integration Tests for Authorization** ⚠️ Medium Priority

**Issue:** Integration tests (`kpi.integration.spec.ts`) don't explicitly test authorization scenarios.

**Current State:**

- ✅ Unit tests cover authorization thoroughly
- ❌ Integration tests only test happy paths with authorized user

**Suggestion:** Add integration test cases:

```typescript
describe("Authorization", () => {
  let otherDepartment: Department;
  let otherUser: User;
  let otherUserToken: string;
  let crossDeptRecord: KpiRecord;

  beforeAll(async () => {
    // Create another department and user
    otherDepartment = await prismaService.department.create({...});
    otherUser = await prismaService.user.create({...});
    // Login to get token
    otherUserToken = (await login(otherUser)).accessToken;
    // Create KPI record in testDepartment
    crossDeptRecord = await createKpiRecord(testDepartment.id);
  });

  it("should return 403 when user accesses different department's KPI", async () => {
    await request(app.getHttpServer())
      .get(`/api/kpi/records/${crossDeptRecord.id}`)
      .set("Authorization", `Bearer ${otherUserToken}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.errorCode).toBe(ErrorCodes.KPI.ACCESS_DENIED);
      });
  });

  it("should filter records by user's department in findAll", async () => {
    // Create records in both departments
    // Verify user only sees their department's records
  });

  it("should prevent creating KPI for different department", async () => {
    await request(app.getHttpServer())
      .post("/api/kpi/records")
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({
        departmentId: testDepartment.id, // Different from otherUser's dept
        year: 2025,
        title: "Unauthorized",
      })
      .expect(403);
  });
});
```

**Impact:** Ensures end-to-end authorization works correctly in real scenarios

---

### 3. **Code Duplication: Extract User Resolution** ⚠️ Low Priority

**Issue:** Controllers repeat the same pattern of resolving user department.

**Current Pattern (Repeated 5 times per controller):**

```typescript
const user = await this.userDepartmentResolver.getUserWithDepartment(
  req.user.id
);
```

**Suggestion:** Use a decorator or extract to base controller method:

```typescript
// Option 1: Custom Parameter Decorator
export const CurrentUserWithDepartment = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const resolver = ctx.switchToHttp().getRequest().app
      .get(UserDepartmentResolver);
    return resolver.getUserWithDepartment(request.user.id);
  }
);

// Usage
@Get()
async findAll(@CurrentUserWithDepartment() user: UserWithDepartment) {
  return this.kpiRecordService.findAll({}, user);
}
```

**Impact:** Reduces code duplication and improves maintainability

---

### 4. **Security: Add Audit Logging for Authorization Failures** 💡 Nice to Have

**Issue:** No logging for authorization failures (403 errors).

**Suggestion:** Add audit logging:

```typescript
// In checkDepartmentAccess and checkParentRecordAccess
private checkDepartmentAccess(
  recordDepartmentId: string,
  user: UserWithDepartment
): void {
  if (user.isAdmin || user.isBoss) {
    return;
  }

  if (!user.departmentId || recordDepartmentId !== user.departmentId) {
    // Log authorization failure
    this.logger.warn(
      `Authorization denied: User ${user.userId} attempted to access department ${recordDepartmentId}`,
      { userId: user.userId, departmentId: recordDepartmentId }
    );

    throw CustomException.forbidden(
      ErrorCodes.KPI.ACCESS_DENIED,
      "Access denied: KPI record belongs to a different department"
    );
  }
}
```

**Impact:** Helps with security auditing and debugging unauthorized access attempts

---

### 5. **Error Codes: Consider More Specific Error Codes** 💡 Nice to Have

**Current:** Uses generic `ACCESS_DENIED` for all authorization failures.

**Suggestion:** Consider more specific error codes for better frontend handling:

```typescript
KPI: {
  ACCESS_DENIED: "kpi.access.denied", // Generic
  ACCESS_DENIED_NO_DEPARTMENT: "kpi.access.denied.no_department", // User has no dept
  ACCESS_DENIED_DIFFERENT_DEPARTMENT: "kpi.access.denied.different_department", // Cross-dept
  DEPARTMENT_MISMATCH: "kpi.department.mismatch", // Already exists
}
```

**Impact:** Frontend can show more specific error messages

---

## Positive Feedback

### ✅ 1. Clean Authorization Logic

The `checkDepartmentAccess()` and `checkParentRecordAccess()` helper methods are well-designed:

- Clear separation of concerns
- Consistent error handling
- Easy to understand and maintain

```184:207:apps/api/src/modules/kpi/services/kpi-record.service.ts
  private checkDepartmentAccess(
    recordDepartmentId: string,
    user: UserWithDepartment
  ): void {
    // Admin/Boss: Full access
    if (user.isAdmin || user.isBoss) {
      return;
    }

    // Regular users: Must match their department
    if (!user.departmentId) {
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "User must belong to a department to access KPI records"
      );
    }

    if (recordDepartmentId !== user.departmentId) {
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "Access denied: KPI record belongs to a different department"
      );
    }
  }
```

### ✅ 2. Comprehensive Unit Test Coverage

Unit tests thoroughly cover:

- Admin/boss full access scenarios
- Regular user department filtering
- Unauthorized access attempts (403 errors)
- Edge cases (no department, invalid department)
- All CRUD operations

**Example:**

```269:287:apps/api/src/modules/kpi/services/kpi-record.service.spec.ts
    it("should throw 403 when regular user accesses different department", async () => {
      const differentDeptRecord = {
        ...mockKpiRecord,
        departmentId: "dept-2",
      };
      prismaService.kpiRecord.findUnique = jest
        .fn()
        .mockResolvedValue(differentDeptRecord);

      try {
        await service.findOne("kpi-record-1", mockRegularUser);
        fail("Expected CustomException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomException);
        expect((error as CustomException).errorCode).toBe(
          ErrorCodes.KPI.ACCESS_DENIED
        );
      }
    });
```

### ✅ 3. Successful Circular Dependency Resolution

The team correctly identified and resolved the circular dependency between `KpiMetricService` and `KpiRecordService` by:

- Removing `KpiRecordService` dependency from `KpiMetricService`
- Directly querying Prisma for parent record details
- Maintaining clean separation of concerns

```86:121:apps/api/src/modules/kpi/services/kpi-metric.service.ts
  private async checkParentRecordAccess(
    kpiRecordId: string,
    user: UserWithDepartment
  ): Promise<void> {
    const record = await this.prisma.kpiRecord.findUnique({
      where: { id: kpiRecordId },
      select: { departmentId: true },
    });

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    // Admin/Boss: Full access
    if (user.isAdmin || user.isBoss) {
      return;
    }

    // Regular users: Must match their department
    if (!user.departmentId) {
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "User must belong to a department to access KPI metrics"
      );
    }

    if (record.departmentId !== user.departmentId) {
      throw CustomException.forbidden(
        ErrorCodes.KPI.ACCESS_DENIED,
        "Access denied: KPI metric belongs to a different department"
      );
    }
  }
```

### ✅ 4. Consistent Error Handling

All authorization failures use `CustomException.forbidden()` with appropriate error codes:

- Consistent error response format
- Proper HTTP status codes (403)
- Clear error messages
- Error codes for i18n support

### ✅ 5. Proper Security: Information Hiding

The implementation correctly returns 404 (not 403) when a record doesn't exist, preventing information leakage:

```66:88:apps/api/src/modules/kpi/services/kpi-record.service.ts
  async findOne(id: string, user: UserWithDepartment) {
    const record = await this.prisma.kpiRecord.findUnique({
      where: { id },
      include: {
        department: true,
        metrics: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!record) {
      throw CustomException.notFound(
        ErrorCodes.KPI.RECORD_NOT_FOUND,
        "KPI record not found"
      );
    }

    // Check department access
    this.checkDepartmentAccess(record.departmentId, user);

    return record;
  }
```

### ✅ 6. Good Query Optimization

The `findAll()` method correctly filters at the database level rather than fetching all records and filtering in memory:

```44:63:apps/api/src/modules/kpi/services/kpi-record.service.ts
    // Regular users: Only their department
    if (!user.departmentId) {
      // User has no department, return empty array
      return [];
    }

    // Filter by user's department (ignore provided departmentId if different)
    return this.prisma.kpiRecord.findMany({
      where: {
        departmentId: user.departmentId,
        year: year || undefined,
      },
      include: {
        department: true,
        metrics: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
```

---

## Code Quality Metrics

| Metric               | Status       | Notes                                                    |
| -------------------- | ------------ | -------------------------------------------------------- |
| **Type Safety**      | ✅ Excellent | All types properly defined, no `any` usage               |
| **Error Handling**   | ✅ Excellent | Consistent use of CustomException                        |
| **Test Coverage**    | ✅ Good      | Comprehensive unit tests, missing integration auth tests |
| **Code Duplication** | ⚠️ Minor     | Controller methods repeat user resolution pattern        |
| **Performance**      | ⚠️ Good      | Could optimize user resolution with caching/guard        |
| **Security**         | ✅ Excellent | Proper authorization checks, information hiding          |
| **Maintainability**  | ✅ Excellent | Clean code, good separation of concerns                  |

---

## Compliance Check

### ✅ Code Standards (`./docs/code-standards.md`)

- ✅ File naming: `kebab-case.ts` ✓
- ✅ Class naming: `PascalCase` ✓
- ✅ Function naming: `camelCase` ✓
- ✅ Type safety: No implicit `any` ✓
- ✅ NestJS patterns: Proper module structure ✓
- ✅ Error handling: CustomException with error codes ✓

### ✅ Security Standards

- ✅ Authorization checks on all endpoints ✓
- ✅ Information hiding (404 vs 403) ✓
- ✅ Input validation (handled by DTOs) ✓
- ⚠️ Audit logging: Not implemented (suggestion provided)

### ✅ Testing Standards

- ✅ Unit tests for all service methods ✓
- ✅ Authorization scenarios covered ✓
- ⚠️ Integration tests: Missing authorization scenarios (suggestion provided)

---

## Recommendations Summary

### Must Fix (Before Production)

- None

### Should Fix (Recommended)

1. **Add integration tests for authorization scenarios** (Suggestion #2)
2. **Optimize user department resolution** (Suggestion #1) - Use guard/interceptor

### Nice to Have (Future Improvements)

3. **Extract user resolution to reduce duplication** (Suggestion #3)
4. **Add audit logging for authorization failures** (Suggestion #4)
5. **Consider more specific error codes** (Suggestion #5)

---

## Conclusion

Phase 2 implementation is **production-ready** with excellent code quality, comprehensive unit tests, and proper security measures. The suggestions provided are optimizations and enhancements that can be implemented incrementally.

**Recommendation:** ✅ **APPROVE** - Proceed to Phase 3 (Frontend Filtering)

---

## Review Checklist

- [x] Code follows project standards
- [x] Security vulnerabilities checked
- [x] Performance implications analyzed
- [x] Test coverage reviewed
- [x] Error handling verified
- [x] Documentation reviewed
- [x] Suggestions provided
- [x] Positive feedback documented

---

**Next Steps:**

1. Consider implementing Suggestion #1 (Performance optimization) before high traffic
2. Add integration tests for authorization (Suggestion #2) in Phase 4
3. Proceed to Phase 3: Frontend Filtering
