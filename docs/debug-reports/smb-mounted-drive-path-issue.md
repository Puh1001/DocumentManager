# Debug Report: SMB Mounted Drive Path Issue

**Date:** 2024-12-19  
**Issue:** SMB path not accessible when using mounted drive on Windows  
**Error:** `ENOENT: no such file or directory, access 'Z:\IT-Information Technology Dept\devTest'`

---

## Problem Summary

Backend service fails to access SMB share when using mounted drive (Z:) on Windows. Error indicates path `Z:\IT-Information Technology Dept\devTest` does not exist, but user confirms the path exists in Windows Explorer.

---

## Root Cause

**Issue:** Path construction logic for mounted drive does not account for share name in the path.

**Evidence:**

1. **Mounted Drive Configuration:**

   ```
   Z: → \\10.0.60.30\BPVN-Fileserver
   ```

2. **Actual Path Structure:**

   ```
   Z:\Public\IT-Information Technology Dept\devTest  ✅ EXISTS
   ```

3. **Code Constructs:**

   ```
   Z:\IT-Information Technology Dept\devTest  ❌ MISSING "Public"
   ```

4. **Code Logic (Current):**
   ```typescript
   // When SMB_USE_MOUNTED_DRIVE=true
   const drive = "Z:";
   const basePath = "IT-Information Technology Dept\devTest";
   this.basePath = path.join(drive, basePath);
   // Result: Z:\IT-Information Technology Dept\devTest (WRONG)
   ```

**Why:** When Z: is mapped to `\\10.0.60.30\BPVN-Fileserver` (server root), the share name "Public" must be included in the path. The code only joins drive + basePath, missing the share name.

---

## Fix Plan

### Option 1: Include Share Name in Base Path (Recommended)

When using mounted drive, include share name in base path construction:

```typescript
if (useMountedDrive) {
  const drive = this.configService.get<string>("SMB_MOUNTED_DRIVE", "Z:");
  const share = this.configService.get<string>("SMB_SHARE", "Public");
  const basePath = this.configService.get<string>("SMB_BASE_PATH", "");

  // Include share name: Z:\Public\IT-Information Technology Dept\devTest
  const fullBasePath = basePath
    ? path.join(drive, share, basePath.replace(/\\/g, path.sep))
    : path.join(drive, share);

  this.basePath = fullBasePath;
}
```

**Environment Variable:**

```env
SMB_USE_MOUNTED_DRIVE=true
SMB_MOUNTED_DRIVE=Z:
SMB_SHARE=Public  # Include share name
SMB_BASE_PATH=IT-Information Technology Dept\devTest
```

### Option 2: Map Drive Directly to Share

Map Z: directly to the Public share:

```bash
# Unmap current
net use Z: /delete

# Map to Public share
net use Z: \\10.0.60.30\Public /persistent:yes
```

Then base path would be:

```
Z:\IT-Information Technology Dept\devTest  ✅ CORRECT
```

**Environment Variable:**

```env
SMB_USE_MOUNTED_DRIVE=true
SMB_MOUNTED_DRIVE=Z:
SMB_BASE_PATH=IT-Information Technology Dept\devTest
# No need for SMB_SHARE when mapped directly
```

---

## Recommended Fix

**Implement Option 1** - Include share name in path construction for mounted drives. This is more flexible and works regardless of how the drive is mapped.

**Code Change:**

- Update `SmbService` constructor to include `SMB_SHARE` when using mounted drive
- Join: `drive + share + basePath`

**Testing:**

1. Set `SMB_USE_MOUNTED_DRIVE=true`
2. Verify path: `Z:\Public\IT-Information Technology Dept\devTest`
3. Test file operations

---

## Related Files

- `apps/api/src/modules/storage/services/smb.service.ts` (Line 44-49)
- `docs/quick-start.md` (SMB Configuration section)

---

**Status:** 🔴 **FIX REQUIRED**
