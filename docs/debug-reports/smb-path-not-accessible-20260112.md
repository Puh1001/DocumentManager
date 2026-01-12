# Debug Report: SMB Path Not Accessible - ENOENT Error

**Date:** 2026-01-12  
**Status:** 🔍 Root Cause Analysis  
**Priority:** CRITICAL

---

## Problem Summary

**Primary Issue:** SMB service fails to access the mounted path `/shared/IT-Information Technology Dept/devTest` with error `ENOENT: no such file or directory`.

**Secondary Issue:** UserDepartmentResolver cannot find department "Management" in database (multiple warnings).

**Error Logs:**
```
[Nest] ERROR [SmbService] SMB connection test error: ENOENT: no such file or directory, access '/shared/IT-Information Technology Dept/devTest'
[Nest] ERROR [SmbService] SMB basePath: /shared/IT-Information Technology Dept/devTest, platform: linux
[Nest] WARN [SmbService] SMB path not accessible: ENOENT: no such file or directory, access '/shared/IT-Information Technology Dept/devTest'
[Nest] WARN [SmbService] Make sure SMB share is mounted on host: /mnt/smb
[Nest] ERROR [SmbService] Failed to list directory /shared/IT-Information Technology Dept/devTest: ENOENT: no such file or directory, scandir '/shared/IT-Information Technology Dept/devTest'
[Nest] ERROR [FolderSyncService] Sync failed: ENOENT: no such file or directory, scandir '/shared/IT-Information Technology Dept/devTest'
```

---

## Root Cause Analysis (5 Whys)

### Why 1: Why is the path `/shared/IT-Information Technology Dept/devTest` not accessible?

**Answer:** The path doesn't exist because either:
1. The SMB share is not mounted on the host at `/mnt/smb`
2. The Docker volume mount (`/mnt/smb:/shared`) is not working
3. The subfolder `IT-Information Technology Dept/devTest` doesn't exist in the mounted share
4. The `SMB_BASE_PATH` environment variable is set incorrectly

**Evidence:**
- Error: `ENOENT: no such file or directory, access '/shared/IT-Information Technology Dept/devTest'`
- Platform: Linux (production environment)
- Code constructs path: `/shared` + `IT-Information Technology Dept/devTest`

### Why 2: Why might the SMB share not be mounted?

**Answer:** The systemd service that mounts the SMB share may not be running, or the mount failed.

**Evidence:**
- Warning message: "Make sure SMB share is mounted on host: /mnt/smb"
- The code expects the mount at `/mnt/smb` on the host, which should be mapped to `/shared` in the container

**Check Required:**
```bash
# On host
mount | grep smb
ls /mnt/smb
systemctl status smb-mount.service
```

### Why 3: Why might the Docker volume mount not be working?

**Answer:** The volume mount in `docker-compose.prod.yml` may not be configured correctly, or the host path doesn't exist.

**Evidence from code:**
```yaml
# docker-compose.prod.yml:37
volumes:
  - ${SMB_MOUNT_PATH_HOST}:/shared
```

**Check Required:**
```bash
# Check if environment variable is set
echo $SMB_MOUNT_PATH_HOST  # Should be /mnt/smb

# Check if container can see the mount
docker-compose -f docker-compose.prod.yml exec api ls /shared
```

### Why 4: Why might the subfolder not exist?

**Answer:** The `SMB_BASE_PATH` environment variable might be set incorrectly, or the folder structure on the SMB share is different than expected.

**Evidence from code:**
```typescript
// apps/api/src/modules/storage/services/smb.service.ts:80-91
const basePath = this.configService.get<string>("SMB_BASE_PATH", "");
if (basePath) {
  const normalizedBasePath = basePath.replace(/\\/g, "/");
  this.basePath = path.join(mountPath, normalizedBasePath);
}
```

**Expected Path Construction:**
- `SMB_MOUNT_PATH` = `/shared` (default)
- `SMB_BASE_PATH` = `IT-Information Technology Dept/devTest` (from env)
- Final path: `/shared/IT-Information Technology Dept/devTest`

**Check Required:**
```bash
# Check environment variable in container
docker-compose -f docker-compose.prod.yml exec api env | grep SMB_BASE_PATH

# Check if folder exists on host mount
ls -la /mnt/smb/IT-Information\ Technology\ Dept/devTest
```

### Why 5: Why is the path construction using spaces in folder names?

**Answer:** The folder name contains spaces (`IT-Information Technology Dept`), which is valid but requires proper path handling. The code uses `path.join()` which should handle this correctly, but the actual folder might not exist or have a different name.

**Evidence:**
- Path contains: `IT-Information Technology Dept/devTest`
- Code normalizes backslashes to forward slashes for Linux
- Uses `path.join()` which should handle spaces correctly

---

## Evidence

### Code Analysis

**File:** `apps/api/src/modules/storage/services/smb.service.ts`

**Linux Path Construction (Lines 74-101):**
```typescript
} else {
  // Production: Linux mounted path (from Docker volume)
  const mountPath = this.configService.get<string>(
    "SMB_MOUNT_PATH",
    "/shared"
  );
  const basePath = this.configService.get<string>(
    "SMB_BASE_PATH",
    ""
  );

  // Append basePath to mountPath if provided
  if (basePath) {
    const normalizedBasePath = basePath.replace(/\\/g, "/");
    this.basePath = path.join(mountPath, normalizedBasePath);
    this.logger.log(
      `Using mounted path with basePath: ${this.basePath} (mountPath: ${mountPath}, basePath: ${basePath})`
    );
  } else {
    this.basePath = mountPath;
    this.logger.warn(
      `SMB_BASE_PATH not set in production! Syncing from root: ${this.basePath}. This may sync entire share instead of specific folder.`
    );
  }
}
```

**Connection Test (Lines 149-178):**
```typescript
async testConnection(): Promise<boolean> {
  try {
    await fs.promises.access(this.basePath, fs.constants.R_OK);
    const stats = await fs.promises.stat(this.basePath);
    if (!stats.isDirectory()) {
      throw new Error(`SMB basePath is not a directory: ${this.basePath}`);
    }
    return true;
  } catch (error: unknown) {
    // Logs error with basePath and platform
    throw error;
  }
}
```

### Configuration

**Docker Compose (docker-compose.prod.yml):**
```yaml
services:
  api:
    environment:
      - SMB_MOUNT_PATH=${SMB_MOUNT_PATH}
      - SMB_BASE_PATH=${SMB_BASE_PATH}
    volumes:
      - ${SMB_MOUNT_PATH_HOST}:/shared
```

**Expected Environment Variables:**
- `SMB_MOUNT_PATH=/shared` (path in container)
- `SMB_BASE_PATH=IT-Information Technology Dept/devTest` (subfolder)
- `SMB_MOUNT_PATH_HOST=/mnt/smb` (host mount point)

---

## Fix Plan

### Step 1: Verify SMB Mount on Host (CRITICAL)

**Action:** Check if SMB share is mounted on the host system.

```bash
# Check mount status
mount | grep smb

# Check if mount point exists and is accessible
ls -la /mnt/smb

# Check systemd service status
systemctl status smb-mount.service

# If not mounted, check service logs
journalctl -u smb-mount.service -n 50
```

**Expected Result:**
- Mount should show: `//10.0.60.30/Public on /mnt/smb type cifs`
- `/mnt/smb` should be accessible and contain SMB share contents
- Service should be active and running

**If Not Mounted:**
1. Check SMB credentials: `/etc/smb-credentials`
2. Test manual mount:
   ```bash
   sudo mount -t cifs //10.0.60.30/Public /mnt/smb \
     -o credentials=/etc/smb-credentials,uid=1000,gid=1000,file_mode=0664,dir_mode=0775
   ```
3. If successful, enable systemd service:
   ```bash
   sudo systemctl enable smb-mount.service
   sudo systemctl start smb-mount.service
   ```

### Step 2: Verify Docker Volume Mount

**Action:** Check if Docker container can access the mounted volume.

```bash
# Check environment variables
docker-compose -f docker-compose.prod.yml exec api env | grep SMB

# Check if /shared exists in container
docker-compose -f docker-compose.prod.yml exec api ls -la /shared

# Check if subfolder exists
docker-compose -f docker-compose.prod.yml exec api ls -la "/shared/IT-Information Technology Dept/devTest"
```

**Expected Result:**
- `SMB_MOUNT_PATH=/shared`
- `SMB_BASE_PATH=IT-Information Technology Dept/devTest`
- `/shared` should be accessible
- Subfolder should exist

**If Volume Mount Fails:**
1. Check `SMB_MOUNT_PATH_HOST` environment variable on host
2. Verify docker-compose.prod.yml volume configuration
3. Restart container: `docker-compose -f docker-compose.prod.yml restart api`

### Step 3: Verify Folder Structure on SMB Share

**Action:** Check if the expected folder structure exists on the SMB share.

```bash
# On host, check SMB share structure
ls -la /mnt/smb
ls -la "/mnt/smb/IT-Information Technology Dept"
ls -la "/mnt/smb/IT-Information Technology Dept/devTest"
```

**Expected Result:**
- Folder `IT-Information Technology Dept` should exist
- Subfolder `devTest` should exist inside it

**If Folder Doesn't Exist:**
1. Verify the correct path on the SMB server
2. Update `SMB_BASE_PATH` environment variable if path is different
3. Create the folder structure if needed (with proper permissions)

### Step 4: Verify Environment Variables

**Action:** Ensure all required environment variables are set correctly.

**Check `.env` or environment configuration:**
```bash
# On host
cat .env | grep SMB

# Expected:
# SMB_MOUNT_PATH=/shared
# SMB_BASE_PATH=IT-Information Technology Dept/devTest
# SMB_MOUNT_PATH_HOST=/mnt/smb
```

**If Variables Missing:**
1. Add to `.env` file or environment configuration
2. Restart Docker containers
3. Verify in container: `docker-compose exec api env | grep SMB`

### Step 5: Add Better Error Handling and Diagnostics

**Action:** Improve error messages to help diagnose mount issues.

**Proposed Code Changes:**
1. Add mount point existence check before path construction
2. Add detailed logging of environment variables (masked credentials)
3. Add check for parent directory existence
4. Provide actionable error messages

---

## Secondary Issue: Department "Management" Not Found

### Problem
Multiple warnings about department "Management" not being found:
```
[Nest] WARN [UserDepartmentResolver] Department not found for user department string: "Management"
```

### Root Cause
The department "Management" doesn't exist in the database. The seed data (`apps/api/prisma/seed.ts`) doesn't include a department with code or name "Management".

### Evidence
- Seed file contains departments: BOD, HCNS, KINH_DOANH, KE_TOAN, IT, etc.
- No "Management" department in seed data
- UserDepartmentResolver tries to match by code first, then by name (case-insensitive)
- Both lookups fail, resulting in null

### Fix Options

**Option 1: Add "Management" Department to Database**
```typescript
// Add to seed.ts
{
  code: "MANAGEMENT",
  nameVi: "Quản lý",
  nameEn: "Management",
  nameZh: "管理",
  physicalLocation: "Tủ X, Kệ 1",
}
```

**Option 2: Map "Management" to Existing Department**
- Update user data to use existing department code
- Or add mapping in UserDepartmentResolver

**Option 3: Create Migration Script**
- Create script to add missing departments from user data
- Run migration to populate departments table

### Recommended Action
1. Check what "Management" should map to (possibly "BOD" - General Manager's Office)
2. Either add the department or update user data
3. Run migration/seed to update database

---

## Verification Steps

After applying fixes:

1. **Verify SMB Mount:**
   ```bash
   mount | grep smb
   ls /mnt/smb
   ```

2. **Verify Container Access:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec api ls /shared
   docker-compose -f docker-compose.prod.yml exec api ls "/shared/IT-Information Technology Dept/devTest"
   ```

3. **Verify Application:**
   - Check logs for successful SMB connection
   - Test file sync functionality
   - Verify no ENOENT errors

4. **Verify Department Resolution:**
   - Check logs for department warnings
   - Verify users can access KPI data
   - Test department filtering

---

## Related Files

- `apps/api/src/modules/storage/services/smb.service.ts` - SMB service implementation
- `docker-compose.prod.yml` - Docker volume configuration
- `apps/api/src/modules/kpi/services/user-department.resolver.ts` - Department resolver
- `apps/api/prisma/seed.ts` - Database seed data
- `docs/deployment-guide.md` - Deployment instructions
- `docs/debug-reports/sync-wrong-path-issue.md` - Related issue

---

## Status

✅ **ROOT CAUSE IDENTIFIED**

**Primary Issue:** **WRONG SMB SHARE NAME** - Using `Public` instead of `BPVN-Fileserver`

**Evidence from Diagnostics:**
- ✅ Network connectivity: OK (ping successful)
- ✅ cifs-utils: Installed
- ✅ Mount script: Exists and executable
- ✅ Credentials file: Exists with correct permissions
- ✅ Systemd service: Configured correctly
- ✅ **Credentials work**: `smbclient` successfully lists shares
- ❌ **Wrong share name**: Script uses `//10.0.60.30/Public` but actual share is `BPVN-Fileserver`

**Kernel Log Evidence:**
```
[6433508.216697] CIFS: Attempting to mount \\10.0.60.30\Public
[6433508.217468] CIFS: VFS:  BAD_NETWORK_NAME: \\10.0.60.30\Public
[6433508.240894] CIFS: VFS: cifs_mount failed w/return code = -2
```

**smbclient Output Shows Available Shares:**
```
Sharename       Type      Comment
BPVN-Fileserver Disk      ← CORRECT SHARE NAME
E$              Disk      Cluster Default Share
IPC$            IPC       Remote IPC
vn-share        Disk
```

**Root Cause:** Mount script in `/usr/local/bin/mount-smb.sh` uses incorrect share name `Public` instead of `BPVN-Fileserver`

**Error Logs:**
```
mount error(13): Permission denied
mount error(2): No such file or directory
Refer to the mount.cifs(8) manual page (e.g. man mount.cifs) and kernel log messages (dmesg)
```

**Possible Causes:**
1. **SMB Version incompatibility** - Server may require different SMB version
2. **Credentials issue** - Username/password may be incorrect or expired
3. **Domain authentication** - Domain join or authentication method issue
4. **Mount point permissions** - Mount point may have wrong ownership
5. **Kernel module** - CIFS kernel module may not be loaded

---

## Additional Diagnostic Commands

### Check Kernel Logs
```bash
sudo dmesg | tail -50
```

### Check CIFS Kernel Module
```bash
lsmod | grep cifs
```

### Check Current User/Group IDs
```bash
id
```

### Test Mount with Different SMB Versions
```bash
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o credentials=/etc/smb-credentials,uid=1000,gid=1000,vers=2.0
```

```bash
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o credentials=/etc/smb-credentials,uid=1000,gid=1000,vers=2.1
```

```bash
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o credentials=/etc/smb-credentials,uid=1000,gid=1000,vers=1.0
```

### Test Mount with Different Options
```bash
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o username=V250813,password='Akira10012002.',domain=bestpacific.com,uid=1000,gid=1000,vers=3.0
```

### Check SMB Server Accessibility
```bash
smbclient -L //10.0.60.30 -U V250813 -W bestpacific.com
```

### Check Mount Point Ownership
```bash
ls -ld /mnt/smb
```

### Test with Root User Explicitly
```bash
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o credentials=/etc/smb-credentials,uid=0,gid=0,vers=3.0
```

### Check if Credentials File Format is Correct
```bash
sudo cat /etc/smb-credentials | od -c
```

### Test Mount with Verbose Output
```bash
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o credentials=/etc/smb-credentials,uid=1000,gid=1000,vers=3.0,debug
```

---

## Fix Required

### Step 1: Update Mount Script with Correct Share Name

**File:** `/usr/local/bin/mount-smb.sh`

**Change:**
```bash
# OLD (WRONG):
SMB_SHARE="//10.0.60.30/Public"

# NEW (CORRECT):
SMB_SHARE="//10.0.60.30/BPVN-Fileserver"
```

**Commands to fix:**
```bash
sudo nano /usr/local/bin/mount-smb.sh
```

Change line 7 from:
```bash
SMB_SHARE="//10.0.60.30/Public"
```

To:
```bash
SMB_SHARE="//10.0.60.30/BPVN-Fileserver"
```

Save and exit (Ctrl+X, Y, Enter)

### Step 2: Test Manual Mount with Correct Share Name

```bash
sudo mount -t cifs //10.0.60.30/BPVN-Fileserver /mnt/smb -o credentials=/etc/smb-credentials,uid=1000,gid=1000,file_mode=0664,dir_mode=0775,iocharset=utf8,vers=3.0
```

```bash
mount | grep smb
```

```bash
ls -la /mnt/smb
```

### Step 3: Verify Folder Structure Exists

```bash
ls -la "/mnt/smb/IT-Information Technology Dept"
```

```bash
ls -la "/mnt/smb/IT-Information Technology Dept/devTest"
```

### Step 4: Restart Systemd Service

```bash
sudo systemctl daemon-reload
```

```bash
sudo systemctl restart smb-mount.service
```

```bash
sudo systemctl status smb-mount.service
```

```bash
mount | grep smb
```

### Step 5: Enable Service for Auto-Start

```bash
sudo systemctl enable smb-mount.service
```

```bash
sudo systemctl is-enabled smb-mount.service
```

### Step 6: Verify Docker Container Access

```bash
ls -la /mnt/smb
```

```bash
docker exec iso-docs-api ls -la /shared
```

```bash
docker exec iso-docs-api env | grep SMB
```

**Secondary Actions:**
1. Add "Management" department or map to existing department
2. Update user data if needed
3. Run database migration/seed

---

---

## UPDATE: Mount Successful, But Path Structure Issue

**Status:** ✅ Mount successful, ❌ Path structure mismatch

**Evidence:**
- ✅ Mount successful: `//10.0.60.30/BPVN-Fileserver` mounted to `/mnt/smb`
- ✅ Docker container can access `/shared`
- ✅ Environment variables set correctly
- ❌ **Path mismatch**: Code looks for `/mnt/smb/IT-Information Technology Dept/devTest` but actual path is `/mnt/smb/Public/IT-Information Technology Dept/devTest`

**Actual Folder Structure:**
```
/mnt/smb/
  ├── BPT/
  ├── Dept/
  ├── Public/                    ← Missing in SMB_BASE_PATH
  │   └── IT-Information Technology Dept/
  │       └── devTest/
  └── Thumbs.db
```

**Environment Variable Shows Correct Path:**
```
SMB_NETWORK_PATH=\\10.0.60.30\BPVN-Fileserver\Public\IT-Information Technology Dept\devTest
```

**Root Cause:** `SMB_BASE_PATH` is missing `Public` folder prefix. Should be `Public/IT-Information Technology Dept/devTest` instead of `IT-Information Technology Dept/devTest`

---

## Additional Verification Commands

### Check if Public folder contains the target directory

```bash
ls -la "/mnt/smb/Public"
```

```bash
ls -la "/mnt/smb/Public/IT-Information Technology Dept"
```

```bash
ls -la "/mnt/smb/Public/IT-Information Technology Dept/devTest"
```

### Verify Docker container can access the correct path

```bash
docker exec iso-docs-api ls -la "/shared/Public"
```

```bash
docker exec iso-docs-api ls -la "/shared/Public/IT-Information Technology Dept"
```

```bash
docker exec iso-docs-api ls -la "/shared/Public/IT-Information Technology Dept/devTest"
```

---

## Final Fix Required

### Update SMB_BASE_PATH Environment Variable

**Current (WRONG):**
```
SMB_BASE_PATH=IT-Information Technology Dept\devTest
```

**Should be (CORRECT):**
```
SMB_BASE_PATH=Public/IT-Information Technology Dept/devTest
```

**Or (with backslashes for Windows compatibility):**
```
SMB_BASE_PATH=Public\IT-Information Technology Dept\devTest
```

### Where to Update

1. **Environment file** (`.env` or `.env.production`):
   ```bash
   SMB_BASE_PATH=Public/IT-Information Technology Dept/devTest
   ```

2. **Docker Compose** (if using environment file):
   ```yaml
   environment:
     - SMB_BASE_PATH=${SMB_BASE_PATH}
   ```

3. **Restart Docker container** after updating:
   ```bash
   docker restart iso-docs-api
   ```

4. **Verify in container**:
   ```bash
   docker exec iso-docs-api env | grep SMB_BASE_PATH
   ```

5. **Test path access**:
   ```bash
   docker exec iso-docs-api ls -la "/shared/Public/IT-Information Technology Dept/devTest"
   ```

---

**Next Steps:** 
1. Run verification commands to confirm folder structure
2. Update `SMB_BASE_PATH` to include `Public/` prefix
3. Restart Docker container
4. Verify application can access the path

---

## NEW ISSUE: Virtual Folders in Database vs Real SMB Folders

**Date:** 2026-01-12  
**Status:** 🔍 Analysis Required  
**Priority:** HIGH

---

## Problem Summary

**Issue:** Database contains many "virtual folders" (created from seed data) that don't exist on the actual SMB share.

**Evidence:**
- **SMB Share Reality:** Only 7 folders exist in `Public/IT-Information Technology Dept/devTest`:
  - BOC_SOI, HR, IT, PD, PR, QC, SD
- **Database Contains:** Many virtual folders from seed.ts:
  - BOD, HCNS, KINH_DOANH, KE_TOAN, THU_MUA, XNK, PTVL, PHONG_MAU, SAN_XUAT, etc.
  - Plus subfolders: "Tài liệu ISO", "KPI", "Bảo trì thiết bị", "Cải tiến"

**Root Cause:**
1. **Seed.ts creates virtual folders** based on departments (not from SMB)
2. **Sync service has cleanup logic** (Pass 2) but may not have run correctly
3. **Path mismatch** - If sync ran from wrong path, cleanup didn't work

---

## Root Cause Analysis

### Why Virtual Folders Exist

**From seed.ts (lines 728-779):**
```typescript
// Creates folders based on departments
const folderPath = dept.code; // e.g., "BOD", "HCNS", "IT"
await prisma.folder.upsert({
  where: { path: folderPath },
  create: {
    name: dept.nameVi, // Vietnamese name
    path: folderPath,
    departmentId: department.id,
  },
});

// Creates subfolders
const subfolders = ["Tài liệu ISO", "KPI", "Bảo trì thiết bị", "Cải tiến"];
for (const sub of subfolders) {
  await prisma.folder.upsert({
    where: { path: `${folderPath}/${sub}` },
    // ...
  });
}
```

**These folders are created in database but don't exist on SMB share.**

### Sync Cleanup Logic

**From folder-sync.service.ts (Pass 2):**
```typescript
// Clean up deleted folders
const allFolders = await prisma.folder.findMany({
  where: { deletedAt: null },
});

for (const folder of allFolders) {
  if (!seenPaths.has(folder.path)) {
    // Folder deleted on file system
    await this.syncDeletionHandler.handleDeletedFolder(folder);
  }
}
```

**This should cleanup orphaned folders, but:**
- Only works if sync ran from correct path
- Only works if sync completed successfully
- Virtual folders will be marked as deleted if not found in `seenPaths`

---

## Solution

### Option 1: Run Sync from Correct Path (RECOMMENDED)

**After fixing SMB_BASE_PATH, run sync:**

1. **Update SMB_BASE_PATH** (as described above):
   ```
   SMB_BASE_PATH=Public/IT-Information Technology Dept/devTest
   ```

2. **Restart container:**
   ```bash
   docker restart iso-docs-api
   ```

3. **Trigger sync via API:**
   ```bash
   curl -X POST http://localhost:8085/storage/folders/sync \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Monitor logs:**
   ```bash
   docker logs -f iso-docs-api | grep -i sync
   ```

5. **Verify cleanup:**
   - Check logs for "Deleted: X folders"
   - Virtual folders should be soft-deleted (deletedAt set)

### Option 2: Manual Cleanup Script (If Sync Doesn't Work)

**Create cleanup script to remove folders not on SMB:**

```typescript
// Cleanup script: apps/api/prisma/cleanup-virtual-folders.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real folders that exist on SMB
const REAL_FOLDERS = [
  "BOC_SOI",
  "HR", 
  "IT",
  "PD",
  "PR",
  "QC",
  "SD"
];

async function cleanup() {
  // Get all active folders
  const allFolders = await prisma.folder.findMany({
    where: { deletedAt: null },
  });

  let deletedCount = 0;
  for (const folder of allFolders) {
    // Check if folder path matches real folders
    const folderName = folder.path.split('/').pop();
    const isRealFolder = REAL_FOLDERS.includes(folderName);
    
    // Check if path starts with real folder
    const isInRealFolder = REAL_FOLDERS.some(real => 
      folder.path.startsWith(real + '/') || folder.path === real
    );

    if (!isRealFolder && !isInRealFolder) {
      // This is a virtual folder - soft delete it
      await prisma.folder.update({
        where: { id: folder.id },
        data: { deletedAt: new Date() },
      });
      deletedCount++;
      console.log(`Deleted virtual folder: ${folder.path}`);
    }
  }

  console.log(`✅ Cleaned up ${deletedCount} virtual folders`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Option 3: Update Seed to Not Create Virtual Folders

**Modify seed.ts to only create folders that exist on SMB:**

- Remove or comment out folder creation in seed.ts
- Only sync folders from SMB share
- Or create seed that matches actual SMB structure

---

## Verification Commands

### Check Database Folders

```bash
# Connect to database
docker exec -it iso-docs-postgres psql -U admin -d documents_db

# Count active folders
SELECT COUNT(*) FROM folders WHERE deleted_at IS NULL;

# List all active folders
SELECT path, name FROM folders WHERE deleted_at IS NULL ORDER BY path;

# Count folders by path pattern
SELECT 
  CASE 
    WHEN path LIKE 'BOC_SOI%' THEN 'BOC_SOI'
    WHEN path LIKE 'HR%' THEN 'HR'
    WHEN path LIKE 'IT%' THEN 'IT'
    WHEN path LIKE 'PD%' THEN 'PD'
    WHEN path LIKE 'PR%' THEN 'PR'
    WHEN path LIKE 'QC%' THEN 'QC'
    WHEN path LIKE 'SD%' THEN 'SD'
    ELSE 'OTHER'
  END as folder_type,
  COUNT(*) as count
FROM folders 
WHERE deleted_at IS NULL
GROUP BY folder_type
ORDER BY count DESC;
```

### Check SMB Folders

```bash
# List folders on SMB
docker exec iso-docs-api ls -la "/shared/Public/IT-Information Technology Dept/devTest"
```

### Check Sync Status

```bash
# Check sync logs
docker logs iso-docs-api | grep -i "sync\|deleted" | tail -50
```

---

## Recommended Action

1. **First:** Fix SMB_BASE_PATH and run sync (Option 1)
2. **If sync doesn't cleanup:** Use manual cleanup script (Option 2)
3. **Long-term:** Update seed.ts to not create virtual folders (Option 3)

**Priority:** Fix SMB_BASE_PATH first, then run sync to automatically cleanup orphaned folders.

---

## NEW ISSUE: Document Count Mismatch - IT/current vs docs

**Date:** 2026-01-12  
**Status:** 🔍 Analysis Required  
**Priority:** MEDIUM

---

## Problem Summary

**Issue:** Folder `IT/current` shows fewer files in web interface compared to "docs" folder/view.

**Evidence:**
- **SMB Reality:** `IT/current` contains 3 files:
  - `2025.11 BẢNG CHẤM CÔNG - MG - Copy.xlsx`
  - `backblue.gif`
  - `BAO GIA KΕΝΗ FTTH (5).pdf`
- **Web Interface:** `IT/current` shows 5 file entries (includes duplicates)
- **"docs" folder/view:** Shows many more files

**Possible Causes:**
1. **Sync incomplete** - Files in `current` folder not fully synced to database
2. **Path mismatch** - Database paths don't match SMB structure
3. **Duplicate entries** - Same file synced multiple times
4. **"docs" is different folder** - "docs" may be a different folder or aggregated view

---

## Root Cause Analysis

### Why Fewer Files in IT/current?

**Possible Reasons:**

1. **Sync Logic Issue:**
   - Sync starts from root (`""`) and recursively scans
   - If `SMB_BASE_PATH` was wrong, sync may have missed `current` folder
   - Files in `current` may not have been synced

2. **Path Structure:**
   - SMB path: `IT/current/` (relative to basePath)
   - Database path: May be stored differently
   - Sync may not find files if path doesn't match

3. **Document Sync Handler:**
   - `DocumentSyncHandler.syncDocument()` checks if file exists
   - If folder not found in database, file is skipped
   - If checksum calculation fails, file is skipped

4. **"docs" Folder:**
   - May be a different folder (not `current`)
   - May be an aggregated view showing all documents
   - May include documents from multiple folders

---

## Diagnostic Commands

### Check Database Documents in IT/current

**Note:** Database runs in `machine-status-postgres` container, not `iso-docs-postgres`

```bash
# Connect to database (container: machine-status-postgres, user: postgres, db: documents)
docker exec -it machine-status-postgres psql -U postgres -d documents

# Find IT folder
SELECT id, name, path FROM folders WHERE path LIKE '%IT%' AND deleted_at IS NULL;

# Find current subfolder
SELECT id, name, path, parent_id FROM folders WHERE path LIKE '%current%' AND deleted_at IS NULL;

# Count documents in IT/current folder
SELECT COUNT(*) FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path LIKE '%IT%current%' AND d.status = 'ACTIVE';

# List documents in IT/current
SELECT d.file_name, d.file_path, d.file_size, d.updated_at
FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path LIKE '%IT%current%' AND d.status = 'ACTIVE'
ORDER BY d.file_name;

# Check for duplicates
SELECT file_name, COUNT(*) as count
FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path LIKE '%IT%current%' AND d.status = 'ACTIVE'
GROUP BY file_name
HAVING COUNT(*) > 1;
```

### Check SMB Files

```bash
# List files in IT/current on SMB
docker exec iso-docs-api ls -la "/shared/Public/IT-Information Technology Dept/devTest/IT/current"
```

### Check Folder Paths in Database

```bash
# List all IT-related folders
SELECT id, name, path, parent_id, deleted_at 
FROM folders 
WHERE path LIKE '%IT%' 
ORDER BY path;

# Check folder hierarchy
WITH RECURSIVE folder_tree AS (
  SELECT id, name, path, parent_id, 0 as level
  FROM folders
  WHERE path = 'IT' AND deleted_at IS NULL
  UNION ALL
  SELECT f.id, f.name, f.path, f.parent_id, ft.level + 1
  FROM folders f
  JOIN folder_tree ft ON f.parent_id = ft.id
  WHERE f.deleted_at IS NULL
)
SELECT * FROM folder_tree ORDER BY level, path;
```

### Check Sync Status

```bash
# Check sync logs
docker logs iso-docs-api | grep -i "sync\|IT\|current" | tail -100

# Check for sync errors
docker logs iso-docs-api | grep -i "error.*current\|failed.*current" | tail -50
```

### Compare with "docs" Folder

```bash
# Connect to database
docker exec -it machine-status-postgres psql -U postgres -d documents

# Find "docs" folder
SELECT id, name, path FROM folders WHERE name LIKE '%docs%' OR path LIKE '%docs%';

# Count documents in "docs"
SELECT COUNT(*) FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE (f.name LIKE '%docs%' OR f.path LIKE '%docs%') AND d.status = 'ACTIVE';

# List "docs" folder structure
SELECT f.path, COUNT(d.id) as doc_count
FROM folders f
LEFT JOIN documents d ON f.id = d.folder_id AND d.status = 'ACTIVE'
WHERE f.path LIKE '%docs%' AND f.deleted_at IS NULL
GROUP BY f.path
ORDER BY f.path;
```

---

## Solution

### Step 1: Verify Folder Structure

```bash
# Check if IT/current folder exists in database
docker exec -it machine-status-postgres psql -U postgres -d documents -c "
SELECT id, name, path FROM folders 
WHERE path LIKE '%IT%current%' AND deleted_at IS NULL;
"
```

### Step 2: Verify Files on SMB

```bash
# List actual files
docker exec iso-docs-api ls -la "/shared/Public/IT-Information Technology Dept/devTest/IT/current"
```

### Step 3: Run Sync for IT/current

```bash
# Trigger sync via API
curl -X POST http://localhost:8085/storage/folders/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4: Check for Duplicates

```bash
# Find duplicate documents
docker exec -it machine-status-postgres psql -U postgres -d documents -c "
SELECT file_name, COUNT(*) as count, array_agg(id) as doc_ids
FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path LIKE '%IT%current%' AND d.status = 'ACTIVE'
GROUP BY file_name
HAVING COUNT(*) > 1;
"
```

### Step 5: Clean Up Duplicates (if found)

```bash
# Keep only the latest document for each file_name
docker exec -it machine-status-postgres psql -U postgres -d documents -c "
UPDATE documents 
SET status = 'DELETED'
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY file_name ORDER BY updated_at DESC) as rn
    FROM documents d
    JOIN folders f ON d.folder_id = f.id
    WHERE f.path LIKE '%IT%current%' AND d.status = 'ACTIVE'
  ) t
  WHERE rn > 1
);
"
```

---

## Expected Results

After sync and cleanup:
- `IT/current` should show exactly 3 documents (matching SMB)
- No duplicate entries
- All files from SMB should be in database
- Document count should match SMB file count

---

---

## UPDATE: Root Cause Identified - Duplicate Documents

**Status:** ✅ **ROOT CAUSE FOUND**

**Evidence from Diagnostics:**
- ✅ SMB Reality: 3 files in `IT/current`
- ❌ Database: 5 documents (should be 3)
- ❌ **Duplicate Issue:** `BAO GIA KENH FTTH (5).pdf` has 3 duplicate entries
- ✅ Folder structure: Correct (`IT` → `IT/current`)
- ✅ "docs" folder: Does not exist (0 documents)

**Root Cause:** File `BAO GIA KENH FTTH (5).pdf` was synced 3 times, creating 3 duplicate document records in database.

**Duplicate Details:**
```
BAO GIA KENH FTTH (5).pdf | IT/current/BAO GIA KENH FTTH (5).pdf | 483132 | 2026-01-12 20:02:01.386
BAO GIA KENH FTTH (5).pdf | IT/current/BAO GIA KENH FTTH (5).pdf | 483132 | 2026-01-12 20:02:01.397
BAO GIA KENH FTTH (5).pdf | IT/current/BAO GIA KENH FTTH (5).pdf | 483132 | 2026-01-12 20:02:01.402
```

**Why Duplicates Occurred:**
- Sync ran multiple times
- File was modified/updated during sync
- Sync logic didn't properly detect existing document
- Race condition during concurrent syncs

---

## Solution: Clean Up Duplicates

### Step 1: View All Duplicates

```bash
docker exec -it machine-status-postgres psql -U postgres -d documents -c "
SELECT id, file_name, file_path, updated_at, created_at
FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path = 'IT/current' 
  AND d.file_name = 'BAO GIA KENH FTTH (5).pdf'
  AND d.status = 'ACTIVE'
ORDER BY updated_at DESC;
"
```

### Step 2: Keep Only Latest Document (Delete Older Duplicates)

```bash
docker exec -it machine-status-postgres psql -U postgres -d documents -c "
-- First, see what will be deleted (dry run)
SELECT id, file_name, updated_at, 
       ROW_NUMBER() OVER (PARTITION BY file_name ORDER BY updated_at DESC) as rn
FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path = 'IT/current' 
  AND d.file_name = 'BAO GIA KENH FTTH (5).pdf'
  AND d.status = 'ACTIVE';
"
```

### Step 3: Delete Duplicates (Keep Latest)

```bash
docker exec -it machine-status-postgres psql -U postgres -d documents -c "
UPDATE documents 
SET status = 'DELETED'
WHERE id IN (
  SELECT id FROM (
    SELECT d.id, 
           ROW_NUMBER() OVER (PARTITION BY d.file_name ORDER BY d.updated_at DESC) as rn
    FROM documents d
    JOIN folders f ON d.folder_id = f.id
    WHERE f.path = 'IT/current' 
      AND d.file_name = 'BAO GIA KENH FTTH (5).pdf'
      AND d.status = 'ACTIVE'
  ) t
  WHERE rn > 1
);
"
```

### Step 4: Verify Cleanup

```bash
docker exec -it machine-status-postgres psql -U postgres -d documents -c "
SELECT COUNT(*) as total_docs FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path = 'IT/current' AND d.status = 'ACTIVE';

SELECT file_name, COUNT(*) as count
FROM documents d
JOIN folders f ON d.folder_id = f.id
WHERE f.path = 'IT/current' AND d.status = 'ACTIVE'
GROUP BY file_name;
"
```

**Expected Result:**
- Total documents: 3 (matching SMB)
- Each file_name: count = 1 (no duplicates)

---

## About "docs" Folder

**Finding:** No folder named "docs" exists in database (0 documents).

**Possible Explanations:**
1. **User Confusion:** "docs" might refer to:
   - All documents view (aggregated)
   - Another folder with different name
   - Documents page in UI (not a folder)

2. **UI View:** "docs" might be:
   - A view showing all documents across folders
   - A search result view
   - A department-based view

3. **Different Location:** "docs" might be:
   - In a different department folder
   - A deleted folder
   - A virtual folder that was cleaned up

**Recommendation:** Ask user to clarify what "docs" refers to - is it:
- A specific folder path?
- A UI view/page?
- Documents from a specific department?

---

## Summary

**Problem:** 
- Database has 5 documents in `IT/current` but SMB only has 3 files
- File `BAO GIA KENH FTTH (5).pdf` has 3 duplicate entries

**Solution:**
1. ✅ Delete 2 duplicate entries (keep latest)
2. ✅ Verify count matches SMB (3 documents)
3. ✅ Investigate why duplicates occurred (sync logic)

**Next Steps:**
1. Run cleanup script to remove duplicates
2. Verify document count matches SMB
3. Investigate sync logic to prevent future duplicates
4. Clarify what "docs" refers to with user
