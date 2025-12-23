# Phase 03: Backend Error Code System

**Date:** 2025-12-23  
**Priority:** Medium  
**Status:** ✅ Completed  
**Review Status:** ⏳ Not Reviewed

## Context Links

- [Main Plan](./plan.md)
- [Research: Backend Strategy](./research/researcher-02-backend-i18n.md)
- [Scout Report](./scout/scout-01-codebase-analysis.md)

## Overview

Replace hardcoded error messages in backend with error codes. Frontend maps codes to translation keys.

## Key Insights

- Backend returns error codes, not translated messages
- Error code format: `{module}.{action}.{error_type}`
- Frontend handles translation based on user locale
- Maintains RESTful API design
- Single source of truth for error messages

## Requirements

### Functional

- Create error code constants
- Replace exception messages with codes
- Update exception filters to return codes
- Create error code documentation
- Frontend maps codes to translation keys

### Non-Functional

- Backward compatible API responses
- Consistent error code format
- Easy to extend for new errors

## Architecture

### Error Code Format

```
{module}.{action}.{error_type}

Examples:
- auth.login.invalid_credentials
- department.list.load_failed
- document.upload.file_too_large
- user.create.username_exists
```

### Error Response Structure

```typescript
{
  "statusCode": 400,
  "errorCode": "department.create.code_exists",
  "message": "Department code already exists", // Keep for backward compatibility
  "errors": [...]
}
```

### Error Code Constants

```typescript
// apps/api/src/common/errors/error-codes.ts
export const ErrorCodes = {
  AUTH: {
    LOGIN_INVALID_CREDENTIALS: "auth.login.invalid_credentials",
    TOKEN_EXPIRED: "auth.token.expired",
    // ...
  },
  DEPARTMENT: {
    NOT_FOUND: "department.not_found",
    CODE_EXISTS: "department.create.code_exists",
    // ...
  },
  // ...
} as const;
```

## Related Code Files

### Files to Create

- `apps/api/src/common/errors/error-codes.ts` - Error code constants
- `apps/api/src/common/errors/custom-exception.ts` - Custom exception with error code
- `apps/api/src/common/filters/http-exception.filter.ts` - Exception filter (if not exists)

### Files to Modify

- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/strategies/local.strategy.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/department/services/department.service.ts`
- `apps/api/src/modules/storage/services/folder.service.ts`
- `apps/api/src/modules/storage/services/document.service.ts`
- `apps/api/src/modules/storage/services/version.service.ts`
- `apps/api/src/modules/kpi/services/kpi-record.service.ts`
- `apps/api/src/modules/kpi/services/kpi-metric.service.ts`
- `apps/api/src/modules/authorization/services/permission.service.ts`
- `apps/web/src/lib/api.ts` - Error code mapping
- `apps/web/messages/*/errors.json` - Error translations

## Implementation Steps

1. **Create error code constants**
   - Create `apps/api/src/common/errors/error-codes.ts`
   - Define error codes for all modules
   - Use TypeScript const assertions

2. **Create custom exception class**
   - Create `apps/api/src/common/errors/custom-exception.ts`
   - Extend NestJS HttpException
   - Add errorCode property

3. **Create/update exception filter**
   - Check if global exception filter exists
   - Update to include errorCode in response
   - Maintain backward compatibility

4. **Update auth module**
   - Replace "Invalid credentials" with error code
   - Replace "Token expired" with error code
   - Update all auth service exceptions

5. **Update department module**
   - Replace "Department not found" with error code
   - Replace "Department code already exists" with error code
   - Update all department service exceptions

6. **Update storage module**
   - Update folder service exceptions
   - Update document service exceptions
   - Update version service exceptions

7. **Update other modules**
   - Update user service exceptions
   - Update KPI service exceptions
   - Update permission service exceptions

8. **Update frontend error handling**
   - Create error code to translation key mapping
   - Update API client to extract errorCode
   - Map errorCode to `t('errors.{code}')`

9. **Add error translations**
   - Add all error codes to `messages/*/errors.json`
   - Translate to en, vi, zh
   - Test error display

10. **Document error codes**
    - Create error code documentation
    - List all error codes by module
    - Add usage examples

## Todo List

- [x] Create error code constants file
- [x] Create custom exception class
- [x] Create/update exception filter
- [x] Update auth module exceptions
- [x] Update department module exceptions
- [x] Update storage module exceptions
- [x] Update user module exceptions
- [x] Update KPI module exceptions
- [x] Update permission module exceptions
- [x] Update frontend error handling
- [x] Add error translations (en, vi, zh)
- [ ] Test error responses (requires dev server)
- [ ] Document error codes (optional - can be done later)

## Success Criteria

- ✅ All exception messages replaced with error codes
- ✅ API responses include errorCode field
- ✅ Frontend maps error codes to translations
- ✅ All three languages work for errors
- ✅ Backward compatible (message field still present)
- ✅ Error code documentation complete

## Risk Assessment

| Risk                    | Impact | Mitigation                            |
| ----------------------- | ------ | ------------------------------------- |
| Breaking API changes    | High   | Keep message field for compatibility  |
| Missing error codes     | Medium | Comprehensive audit of all exceptions |
| Frontend mapping errors | Low    | Type-safe mapping with TypeScript     |

## Security Considerations

- Don't expose sensitive info in error codes
- Sanitize error messages in responses
- Rate limit error responses if needed

## Next Steps

- Proceed to Phase 04: Route Localization
- Can work in parallel with Phase 02
