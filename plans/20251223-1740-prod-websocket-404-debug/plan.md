# Prod 404 & WebSocket Debug Plan

## Objectives

- Restore dashboard API endpoints from 404 responses.
- Re-establish Socket.IO connectivity on production.
- Confirm favicon and asset paths resolve correctly.

## Scope

- Production environment at `docs.bestpacific.vn`.
- Frontend Next.js app (App Router) and backend/socket services.
- Deployment assets: `docker-compose.prod.yml`, `apps/web/Dockerfile`, env config.

## Constraints / Assumptions

- No new infra resources; focus on config and routing fixes.
- Keep files under 200 lines and adhere to KISS/YAGNI/DRY.
- Must run compile/lint/tests after code changes.

## TODO Tasks

1. Collect prod config: `docker-compose.prod.yml`, env vars, Next config, Socket.IO server config.
2. Trace failing routes (`/en/dashboard/users`, `/en/dashboard/permissions`) to backend handlers.
3. Verify reverse proxy/basePath/rewrite settings for locale-prefixed routes.
4. Check favicon/static asset deployment path.
5. Inspect Socket.IO server URL/proxy/SSL settings; confirm server running.
6. Reproduce locally or via logs; capture evidence.
7. Implement fixes (routing, proxy, env, deployment) and validate.
8. Run build/lint/tests; document changes.

## Deliverables

- Root cause analysis with evidence.
- Applied fixes with verification steps.
- Notes for changelog/roadmap updates.
