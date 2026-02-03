## Phase 01 – Update `apps/api` Dockerfile (multi-stage, approach 2)

### Objectives

- Move all dependency installation work into the `builder` stage.
- Reuse the built `node_modules` and compiled output in the `runner` stage.
- Eliminate `npm ci --only=production` in `runner` to avoid native `canvas` rebuild and `pangocairo` errors.

### Steps

1. **Review current Dockerfile**
   - Confirm `builder` already installs native libs and runs `npm ci` + `npm run build`.
   - Confirm `runner` currently runs `npm ci --only=production` and is where `canvas` fails.
2. **Refactor runner stage**
   - Remove `COPY package*.json` and `RUN npm ci --only=production` from `runner`.
   - Add `COPY --from=builder /app/node_modules ./node_modules`.
   - Keep copying built files (`dist`, `prisma`) from `builder`.
3. **Sanity checks**
   - Make sure `CMD ["node", "dist/src/main"]` still points to the correct path.
   - Ensure Prisma client (`node_modules/.prisma`) is available via copied `node_modules`.
4. **Verification**
   - Run `docker-compose -f docker-compose.prod.yml build api` (or equivalent) locally.
   - Confirm image builds successfully without `pangocairo` / `canvas` errors.
