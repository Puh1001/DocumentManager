# Vietnamese Filename Encoding Fix - Troubleshooting Guide

## Issue Summary

**Problem:** Vietnamese file names displaying as garbled text (mojibake) in KPI attachment lists  
**Example:** "Tản Lậví Ả Ố T..." instead of proper Vietnamese text  
**Affected Areas:** Boss UI and Users UI  
**Date Fixed:** 2026-01-21

## Root Cause

The API was not explicitly declaring `charset=utf-8` in JSON response headers. While UTF-8 is the default for JSON per RFC 8259, browsers may misinterpret the encoding without explicit declaration, causing Vietnamese characters to display incorrectly.

**Technical Details:**
- Vietnamese characters require proper UTF-8 encoding
- NestJS sends responses as `Content-Type: application/json` without charset parameter
- Browsers may fall back to incorrect character encoding (Windows-1252, Latin-1)
- Results in UTF-8 bytes being misinterpreted, producing mojibake

## Fix Implemented

### 1. Global Charset Interceptor
**Purpose:** Ensures all JSON responses explicitly declare UTF-8 encoding

**File:** `apps/api/src/common/interceptors/charset.interceptor.ts`
- Intercepts all HTTP responses
- Adds `charset=utf-8` to `Content-Type` header for JSON responses
- Non-invasive: Only adds if not already present

### 2. RFC 5987 Compliant Download Headers
**Purpose:** Properly handles non-ASCII filenames in downloads

**File:** `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`
- Uses RFC 5987 standard for UTF-8 filenames
- Provides both legacy and modern browser support
- Format: `filename="${fileName}"; filename*=UTF-8''${encodedFileName}`

### 3. Application Configuration
**File:** `apps/api/src/main.ts`
- Registered global charset interceptor
- Applied automatically to all routes

## Verification Steps

### Step 1: Check API Response Headers

```bash
# Test the list attachments endpoint
curl -i -H "Authorization: Bearer <your-token>" \
  http://localhost:3001/api/kpi/records/<record-id>/attachments

# Should see:
# Content-Type: application/json; charset=utf-8
```

### Step 2: Test File Upload with Vietnamese Name

1. Prepare a test PDF with Vietnamese filename:
   - Example: `Tài Liệu Đào Tạo Nhân Viên.pdf`
   - Or: `Báo Cáo Chấm Công Chính Xác.pdf`

2. Upload through UI:
   - Go to KPI page (Boss UI or Users UI)
   - Click "Tải lên" button
   - Select test file

3. Verify display:
   - File name should show correctly in attachment list
   - No garbled characters
   - Diacritics (tone marks) should be correct

### Step 3: Test Download with Vietnamese Name

1. Click on an attachment with Vietnamese filename
2. Download the file
3. Verify downloaded filename is correct:
   - Chrome: Check Downloads folder
   - Firefox: Check Downloads folder
   - Edge: Check Downloads folder

### Step 4: Check Existing Attachments

Review existing KPI attachments to verify they display correctly:
- Boss UI: Navigate to HCNS > KPI section
- Users UI: Navigate to KPI page
- Check if previously uploaded files now display correctly

## Database Encoding Verification

If issues persist, verify database encoding using the provided script:

```bash
cd apps/api
npx tsx scripts/check-encoding.ts
```

This script checks:
- PostgreSQL server encoding (should be UTF8)
- Client encoding (should be UTF8)
- Sample file names in database
- Whether data was stored correctly

**Expected Output:**
```
✓ Server Encoding: UTF8
✓ Client Encoding: UTF8
✓ Database Encoding: UTF8
```

## Troubleshooting

### Issue: Existing files still show garbled text

**Possible Causes:**
1. **Data was saved incorrectly:** Files uploaded before fix may have corrupted data in database
2. **Browser cache:** Old responses cached by browser
3. **Frontend cache:** React query cache holding old data

**Solutions:**

**1. Clear Browser Cache**
```
Chrome: Ctrl+Shift+Delete > Clear cached images and files
Firefox: Ctrl+Shift+Delete > Cache
Edge: Ctrl+Shift+Delete > Cached data and files
```

**2. Clear React Query Cache**
- Reload page with Ctrl+F5 (hard refresh)
- Or add query key invalidation in upload success handler

**3. Check if Data is Corrupted**

Run the encoding check script to verify:
```bash
npx tsx scripts/check-encoding.ts
```

If data is corrupted (shows wrong characters even in database), you may need data migration.

### Issue: Downloads still have wrong filename

**Check:**
1. Response headers in Network tab
2. Should see `filename*=UTF-8''` parameter
3. Browser must support RFC 5987 (all modern browsers do)

**Solutions:**
- Update browser to latest version
- Check if corporate proxy is stripping headers
- Verify backend changes are deployed

### Issue: New uploads still show garbled text

**Checklist:**
1. ✓ Backend rebuilt: `npm run build` in apps/api
2. ✓ Backend restarted with new code
3. ✓ Interceptor registered in main.ts
4. ✓ No TypeScript errors during build
5. ✓ Environment variables loaded correctly

**Debug:**
```bash
# Check if interceptor is active
curl -v http://localhost:3001/api/kpi/records/<id>/attachments \
  -H "Authorization: Bearer <token>" \
  2>&1 | grep "content-type"

# Should show: content-type: application/json; charset=utf-8
```

## Data Migration (If Needed)

If existing data is corrupted in the database, create a migration script:

```typescript
// apps/api/scripts/fix-corrupted-filenames.ts
import { PrismaClient } from "@prisma/client";

async function fixFilenames() {
  const prisma = new PrismaClient();
  
  // Find documents with potentially corrupted names
  const docs = await prisma.document.findMany({
    where: {
      // Vietnamese diacritics that might be corrupted
      fileName: {
        contains: "Ã",  // Common mojibake pattern
      },
    },
  });
  
  console.log(`Found ${docs.length} potentially corrupted filenames`);
  
  // Manual review and fix required
  // Cannot auto-fix as original intended text is lost
  
  await prisma.$disconnect();
}
```

**Note:** Corrupted data cannot be automatically fixed as the original text is lost. You'll need to:
1. Identify affected files
2. Have users re-upload with correct filenames
3. Or manually correct filenames in database if original names are known

## Prevention

**For Future Development:**
1. ✅ Always explicitly set charset in HTTP headers
2. ✅ Test with non-ASCII characters during development
3. ✅ Use RFC 5987 for Content-Disposition headers
4. ✅ Verify database encoding is UTF-8
5. ✅ Test across different browsers

## Testing Checklist

- [ ] Backend compiled without errors
- [ ] Backend restarted with new code
- [ ] Upload new file with Vietnamese name
- [ ] Verify display in Boss UI
- [ ] Verify display in Users UI
- [ ] Download file with Vietnamese name
- [ ] Check downloaded filename is correct
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Edge
- [ ] Verify API response headers include charset=utf-8
- [ ] Check existing attachments display correctly
- [ ] Run encoding verification script

## References

- [RFC 8259: JSON encoding](https://tools.ietf.org/html/rfc8259)
- [RFC 5987: Character Set and Language Encoding for HTTP Headers](https://tools.ietf.org/html/rfc5987)
- [NestJS Interceptors Documentation](https://docs.nestjs.com/interceptors)
- [PostgreSQL Character Sets](https://www.postgresql.org/docs/current/multibyte.html)

## Support

If issues persist after following this guide:
1. Run the encoding check script and share output
2. Check browser Network tab for API responses
3. Verify backend logs for any errors
4. Test with a fresh browser session (incognito mode)
