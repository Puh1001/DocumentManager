# Plan: Monthly KPI Uploads

**Created:** 2026-01-30  
**Status:** Draft — Pending review  
**Goal:** Add month-scoped KPI uploads; UI shows month selector next to year; attachments filtered/uploaded by month.

## Overview

Current KPI flow is year-only: one year dropdown, attachments per KPI record (per year). This plan adds a **month** dimension so uploads and listing are per month (e.g. January 2025, February 2025).

## Phases

| Phase | Name | Status | Link |
|-------|------|--------|------|
| 1 | Database & API (schema, DTO, list/upload by month) | Done | [phase-01-database-and-api.md](./phase-01-database-and-api.md) |
| 2 | Frontend (month selector, attachment list/upload by month) | Done | [phase-02-frontend-month-selector-and-uploads.md](./phase-02-frontend-month-selector-and-uploads.md) |
| 3 | Testing & docs | Done | [phase-03-testing-and-docs.md](./phase-03-testing-and-docs.md) |

## Dependencies

- Phase 2 depends on Phase 1 (API supports month).
- Phase 3 depends on Phase 1 and 2.

## Research

- [researcher-01-report.md](./research/researcher-01-report.md) — Backend & data model.
- [researcher-02-report.md](./research/researcher-02-report.md) — Frontend & UI.

## Key Decisions

- Add `month` (Int 1–12, nullable for legacy) to `KpiAttachment`.
- List attachments: optional `?month=` on `GET /kpi/records/:id/attachments`.
- Upload: require or default `month` in create attachment payload.
- UI: Month dropdown next to Year on KPI page; attachments list and upload use selected month.
- **1. Default month:** Chọn sẵn tháng hiện tại (frontend default `selectedMonth = current month`).
- **2. Multiple files per month:** Cho phép upload nhiều file trong cùng một tháng (no unique on `(kpiRecordId, month)`).
- **3. Legacy data:** Dữ liệu cũ (`month` NULL) hiển thị ở **mọi tháng cùng năm** — khi list `?month=M` trả về attachments có `month = M` **hoặc** `month IS NULL` (trong cùng record/năm).

## Out of Scope

- Changing KPI records from year to year+month (records remain year-scoped).
- Changing KpiMetric monthly values (m1–m12) — no change.
