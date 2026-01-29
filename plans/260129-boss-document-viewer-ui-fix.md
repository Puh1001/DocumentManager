# Plan: Fix Boss Document Viewer UI (PDF height/overflow)

## Context

- Bug: Boss UI “document view” shows only a thin strip of the PDF; the remaining viewer area is blank/dark.
- Likely cause: PDF viewer child uses `h-full` but the parent container only has `min-height`, so `height: 100%` can’t resolve → `<object>` falls back to default height.

## Goals

- Make PDF viewer consistently fill the available space.
- Ensure scrolling works and layout remains responsive.
- Keep changes minimal, aligned with existing cyber UI styling.

## Tasks

- Locate Boss document view container and PDF viewer component.
- Fix height contract between parent container and `PdfViewer` (prefer explicit height + safe min-height fallback).
- Verify on both:
  - Boss document detail view (`DocumentDetail`)
  - KPI attachment viewer modal (`KpiAttachmentViewer`)
- Run web build/type-check to ensure no compile errors.
- Run relevant tests (at least web unit tests if available).
