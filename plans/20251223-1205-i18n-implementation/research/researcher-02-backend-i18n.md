# Researcher 02: Backend i18n Strategy

**Date:** 2025-12-23  
**Researcher:** Main Agent  
**Focus:** Backend API internationalization approach

## Executive Summary

Backend should return error codes/keys instead of hardcoded messages. Frontend handles translation based on user locale preference.

## Current State Analysis

### Backend Error Messages

- Currently hardcoded in Vietnamese (e.g., "Không tải được danh sách phòng ban")
- Error messages in DTOs, services, controllers
- API responses include `message` field with Vietnamese text

### API Response Format

```typescript
{
  "statusCode": 400,
  "message": "Validation failed", // Hardcoded text
  "errors": [...]
}
```

## Recommended Approach

### Option 1: Error Code System (Recommended)

**Backend:**

- Return error codes instead of messages
- Example: `"errorCode": "DEPARTMENT_LIST_LOAD_FAILED"`

**Frontend:**

- Map error codes to translation keys
- Use `t('errors.DEPARTMENT_LIST_LOAD_FAILED')`

**Pros:**

- ✅ Single source of truth (translation files)
- ✅ Consistent error messages
- ✅ Easy to add new languages
- ✅ No backend changes needed for new languages

**Cons:**

- ⚠️ Requires error code mapping layer

### Option 2: Locale-Aware API

**Backend:**

- Accept `Accept-Language` header
- Return translated messages based on locale

**Pros:**

- ✅ Backend controls all messages

**Cons:**

- ❌ Duplicates translation logic
- ❌ Harder to maintain
- ❌ Not RESTful (language in response)

## Implementation Strategy

### Phase 1: Error Code System

1. **Backend Changes:**
   - Replace hardcoded messages with error codes
   - Create error code constants
   - Update exception filters to return codes

2. **Frontend Changes:**
   - Create error code mapping
   - Add error translations to i18n files
   - Update API client to handle error codes

### Error Code Format

```
{module}.{action}.{error_type}
Examples:
- auth.login.invalid_credentials
- department.list.load_failed
- document.upload.file_too_large
```

### Translation Structure

```json
{
  "errors": {
    "auth": {
      "login": {
        "invalid_credentials": {
          "en": "Invalid username or password",
          "vi": "Tên đăng nhập hoặc mật khẩu không đúng",
          "zh": "用户名或密码错误"
        }
      }
    }
  }
}
```

## Backend Files to Update

1. Exception filters (`apps/api/src/common/filters/`)
2. DTOs with validation messages
3. Service error throws
4. Controller error responses

## Frontend Files to Update

1. API client error handling (`apps/web/src/lib/api.ts`)
2. Error translation utility
3. Toast/notification components

## References

- [REST API Error Handling Best Practices](https://www.baeldung.com/rest-api-error-handling-best-practices)
- [i18n for API Responses](https://www.moesif.com/blog/technical/api-design/How-to-Internationalize-API-Responses/)

## Unresolved Questions

1. Should we support locale in API requests? (Recommendation: No, use error codes)
2. How to handle validation errors from class-validator? (Use error codes in custom messages)
