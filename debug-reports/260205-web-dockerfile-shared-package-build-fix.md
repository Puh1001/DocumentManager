# Debug Report: Web Dockerfile Missing Shared Package Build

**Date:** 2026-02-05  
**Issue:** Docker build fails with "Module not found: Can't resolve '@iso-docs/shared'"  
**Status:** Root cause identified, fix ready

## Phase 1: Root Cause Investigation

### Error Details

```
./src/components/documents/document-list.tsx
Module not found: Can't resolve '@iso-docs/shared'

./src/components/documents/folder-picker-dialog.tsx
Module not found: Can't resolve '@iso-docs/shared'

./src/components/documents/iso-metadata-edit-dialog.tsx
Module not found: Can't resolve '@iso-docs/shared'
```

### Build Context

- **When:** During Docker build for `web` service
- **Stage:** Builder stage, step `RUN npm run build` (line 26)
- **Environment:** Docker build context, monorepo workspace

### Evidence Collected

1. **Web Dockerfile** (`apps/web/Dockerfile`):
   - Copies shared package source code (line 22)
   - Does NOT build shared package before building web app
   - Jumps directly to `npm run build` for web

2. **API Dockerfile** (`apps/api/Dockerfile`):
   - Builds shared package BEFORE building API (lines 28-30)
   - Pattern: `WORKDIR /app/packages/shared` → `RUN npm run build`

3. **Shared Package Structure**:
   - Package exports point to `dist/` folder (package.json lines 5-12)
   - Requires build step (`npm run build`) to generate `dist/` files
   - Without build, `dist/` folder doesn't exist

4. **Next.js Configuration**:
   - `next.config.mjs` has `transpilePackages: ["@iso-docs/shared"]`
   - But transpilation requires source files to exist in expected location
   - Next.js resolves imports via package.json `exports` → needs `dist/` folder

## Phase 2: Pattern Analysis

### Working Example (API Dockerfile)

```dockerfile
# Build shared package first (API depends on @iso-docs/shared dist/)
WORKDIR /app/packages/shared
RUN npm run build

# Build API
WORKDIR /app/apps/api
RUN npm run build
```

### Broken Pattern (Web Dockerfile)

```dockerfile
# Copy source code
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# Build (MISSING: shared package build step)
WORKDIR /app/apps/web
RUN npm run build  # FAILS: can't resolve @iso-docs/shared
```

### Key Difference

- **API:** Builds shared → then builds API ✅
- **Web:** Copies shared → builds web (shared not built) ❌

## Phase 3: Hypothesis

**Root Cause:** Web Dockerfile missing build step for `@iso-docs/shared` package before building web app.

**Why it fails:**

1. Shared package source is copied but not built
2. `dist/` folder doesn't exist
3. Package.json `exports` point to `dist/` files that don't exist
4. Next.js webpack can't resolve `@iso-docs/shared` imports
5. Build fails

**Fix:** Add shared package build step to web Dockerfile, matching API Dockerfile pattern.

## Phase 4: Implementation

### Fix Required

Add shared package build step to `apps/web/Dockerfile`:

```dockerfile
# Copy source code
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# Build shared package first (Web depends on @iso-docs/shared dist/)
WORKDIR /app/packages/shared
RUN npm run build

# Build web
WORKDIR /app/apps/web
RUN npm run build
```

### Verification Steps

1. Build Docker image locally: `docker build -f apps/web/Dockerfile .`
2. Verify shared package `dist/` folder exists in builder stage
3. Verify web build completes successfully
4. Test deployment script

## Impact Assessment

- **Severity:** Critical (blocks deployment)
- **Affected:** Production deployments via `deploy-auto.sh`
- **Risk:** Low (fix follows established pattern from API Dockerfile)
- **Testing:** Requires Docker build verification

## Resolution

✅ Root cause identified  
✅ Fix pattern confirmed (matches API Dockerfile)  
⏳ Fix implementation pending  
⏳ Verification pending
