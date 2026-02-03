## Docker API build fix (canvas / pangocairo)

- **Goal**: Fix Docker build for `apps/api` by avoiding native rebuild of `canvas` in runtime stage using multi-stage Docker pattern.

### TODO

1. **Analyze current Dockerfile**
   - Confirm builder vs runner responsibilities
   - Identify where `npm ci --only=production` runs and why `canvas` fails
2. **Update Dockerfile (approach 2)**
   - Keep `npm ci` + build only in `builder` stage
   - Copy `node_modules` + built `dist`/`prisma` from `builder` to `runner`
   - Remove `npm ci --only=production` from `runner`
3. **Build & verify**
   - Run Docker build for `api` locally
   - Ensure no `pangocairo` / `canvas` errors appear
4. **Cleanup & docs**
   - Keep changes minimal and documented in commit message / debug report if needed
