# Debug Report: PPTX Stream - Failed to Fetch Error

**Date:** 2026-02-26  
**Status:** ✅ Root Cause Identified, Fix Plan Ready

---

## Problem Summary

**Symptom:**
- PPTX viewer shows "Failed to load presentation" error
- Console error: `TypeError: Failed to fetch`
- Network tab shows `200 OK` but Response tab shows "Failed to load response data"
- Direct URL access (without auth) returns `401 Unauthorized` (expected)

**Root Cause:**
- `stream.pipe(res)` in `ClientController.stream` has **no error handling**
- When `fs.createReadStream` fails (file not found, permission denied, etc.), the stream emits an error
- **Headers are already sent** (200 OK) before the error occurs
- Browser receives 200 OK but stream fails → response body is empty → `fetch()` throws `TypeError: Failed to fetch`
- DevTools shows "Failed to load response data" because the stream was aborted

---

## Evidence

### 1. Network Tab Analysis
- **Request:** `GET /api/client/files/a4b6e387-a063-4f8b-8b3c-a685f052fb8f/stream`
- **Status:** `200 OK` ✅
- **Response Headers:** Present (Content-Type, Content-Disposition, etc.)
- **Response Body:** "Failed to load response data" ❌

### 2. Code Flow
```
ClientController.stream()
  → ClientService.getStream()
    → DocumentService.getStream()
      → SmbService.readFileStream()
        → fs.createReadStream(fullPath)  // ❌ No error handling
          → stream.pipe(res)  // ❌ No error listeners
```

### 3. Comparison with Other Controllers
- `DocumentController.stream()` - Same issue (no error handling)
- `KpiAttachmentController.streamAttachment()` - Same issue (no error handling)
- **All streaming endpoints have the same vulnerability**

### 4. Direct URL Test
- Opening URL directly → `401 Unauthorized` (expected, no auth token)
- This confirms the endpoint works, but streaming fails when file is missing/inaccessible

---

## Root Cause Analysis

### Why Headers Are Sent Before Error?
1. `res.setHeader()` calls complete successfully
2. `stream.pipe(res)` starts piping
3. Stream emits `error` event (file not found, permission denied, etc.)
4. Response headers already sent → Cannot change status code
5. Browser receives 200 OK but empty body → `fetch()` rejects

### Why File Might Not Exist?
Possible reasons:
1. **File path incorrect:** `document.filePath` in DB doesn't match actual file location
2. **File not uploaded:** Upload succeeded but `VersionService.createVersion()` failed to write file
3. **File deleted:** File was manually deleted from SMB storage
4. **Permission issue:** Node.js process doesn't have read permission
5. **Path encoding issue:** File path contains special characters not handled correctly

---

## Fix Plan

### Phase 1: Add Error Handling to Stream (Immediate Fix)

**File:** `apps/api/src/modules/client/client.controller.ts`

**Changes:**
1. Add error listeners to stream before piping
2. Check if response headers are already sent before handling errors
3. Log errors for debugging
4. Send proper error response if headers not sent yet

```typescript
@Get("files/:id/stream")
async stream(@Param("id") id: string, @Res({ passthrough: false }) res: Response) {
  try {
    const { stream, fileType } = await this.clientService.getStream(id);
    const mimeType = MIME_TYPES[fileType] || "application/octet-stream";
    
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Add error handling
    stream.on("error", (error) => {
      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          message: "Failed to stream file",
          error: error.message,
        });
      } else {
        // Headers already sent, can only log
        console.error("Stream error after headers sent:", error);
        res.destroy();
      }
    });
    
    res.on("close", () => {
      if (!stream.destroyed) {
        stream.destroy();
      }
    });
    
    stream.pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      if (error instanceof CustomException) {
        res.status(error.statusCode).json(error.getResponse());
      } else {
        res.status(500).json({
          statusCode: 500,
          message: "Internal server error",
        });
      }
    }
  }
}
```

### Phase 2: Validate File Exists Before Streaming (Defense-in-Depth)

**File:** `apps/api/src/modules/storage/services/smb.service.ts`

**Changes:**
1. Check file exists before creating stream
2. Throw meaningful error if file not found

```typescript
async readFileStream(relativePath: string): Promise<Readable> {
  const fullPath = this.getFullPath(relativePath);
  
  // Check file exists before streaming
  try {
    await fs.promises.access(fullPath, fs.constants.F_OK | fs.constants.R_OK);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      throw CustomException.notFound(
        ErrorCodes.DOCUMENT.FILE_NOT_FOUND,
        `File not found: ${relativePath}`
      );
    }
    throw CustomException.internalServerError(
      ErrorCodes.DOCUMENT.FILE_READ_ERROR,
      `Cannot read file: ${nodeError.message}`
    );
  }
  
  return fs.createReadStream(fullPath);
}
```

### Phase 3: Apply Same Fix to Other Controllers (Consistency)

Apply the same error handling pattern to:
- `DocumentController.stream()`
- `KpiAttachmentController.streamAttachment()`

---

## Verification Steps

1. **Test with missing file:**
   - Upload a file, then manually delete it from SMB storage
   - Try to view it → Should get 404/500 error (not "Failed to fetch")

2. **Test with invalid path:**
   - Manually corrupt `document.filePath` in DB
   - Try to view it → Should get proper error message

3. **Test with valid file:**
   - Upload and view PPTX → Should work correctly

4. **Check API logs:**
   - Look for error messages when streaming fails
   - Verify error details are logged

---

## Impact Analysis

### ✅ Benefits
- **Better error messages:** Users see meaningful errors instead of "Failed to fetch"
- **Easier debugging:** Logs show exact error (file not found, permission denied, etc.)
- **Consistent behavior:** All streaming endpoints handle errors the same way

### ⚠️ Considerations
- **Performance:** File existence check adds one `fs.promises.access()` call (minimal overhead)
- **Backward compatibility:** No breaking changes, only improves error handling

---

## Files to Modify

1. `apps/api/src/modules/client/client.controller.ts` - Add error handling
2. `apps/api/src/modules/storage/services/smb.service.ts` - Validate file exists
3. `apps/api/src/modules/storage/controllers/document.controller.ts` - Add error handling (optional, for consistency)
4. `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts` - Add error handling (optional, for consistency)

---

## Next Steps

1. ✅ Root cause identified
2. ⏳ Implement error handling in `ClientController.stream`
3. ⏳ Add file existence check in `SmbService.readFileStream`
4. ⏳ Test with missing file scenario
5. ⏳ Verify error messages are user-friendly
6. ⏳ Apply same pattern to other streaming endpoints (optional)

---

## Notes

- The `200 OK` status with empty body is a common issue when streaming fails after headers are sent
- This fix ensures errors are caught early and proper HTTP status codes are returned
- File existence check prevents unnecessary stream creation for missing files
