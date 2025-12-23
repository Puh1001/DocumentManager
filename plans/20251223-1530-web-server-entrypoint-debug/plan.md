# Web Server Entrypoint Debug Plan

**Created:** 2025-12-23  
**Status:** 📋 Planning in Progress  
**Context:** iso-docs web container fails with `Cannot find module '/app/apps/web/server.js'` after `docker compose -f docker-compose.prod.yml up -d`.

## Objective

Find root cause for missing `server.js` in production web container build and outline fix approach (no code changes yet).

## Phases & Tasks

| Phase | Name                        | Status | Progress |
| ----- | --------------------------- | ------ | -------- |
| 01    | Gather build/run context    | 🔲     | 0%       |
| 02    | Locate expected entrypoint  | 🔲     | 0%       |
| 03    | Identify build/runtime gap  | 🔲     | 0%       |
| 04    | Propose remediation options | 🔲     | 0%       |

## Immediate TODOs

- [ ] Review docker-compose.prod.yml service commands/volumes for web.
- [ ] Inspect apps/web Dockerfile (builder/runner, entrypoint/cmd).
- [ ] Check Next.js output (.next/standalone, server file naming) and start script in package.json.
- [ ] Confirm how server.js is referenced inside image (CMD/ENTRYPOINT) and whether file exists after build.
- [ ] Summarize root cause and recommended fix steps.

## Assumptions / Notes

- No automatic fixes to be applied; investigation only.
- Target stack: Next.js 14 on Node 20 Alpine multi-stage build.
- Shared packages may affect build paths; verify monorepo structure.
