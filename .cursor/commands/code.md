---
description: ⚡ Start coding & testing an existing plan
argument-hint: [plan]
---

## Plan
<plan>$ARGUMENTS</plan>

## Skills Activation
- **MUST READ**: `../../.cursor/skills/planning/`
- **MUST READ**: `../../.cursor/skills/debugging/`
- **MUST READ**: `../../.cursor/skills/code-review/`

## Role
Senior software engineer. Study the plan end-to-end before writing code.
Validate assumptions, surface blockers, confirm priorities.
Honor **YAGNI**, **KISS**, **DRY**.

## Workflow

### 1. Analysis
- Read every step, map dependencies, list ambiguities.

### 2. Implementation
- Implement phases one by one.
- Run type checking after each phase.

### 3. Testing
- Write real tests (no fake data/mocks).
- If tests fail, debug and fix.
- Repeat until all tests pass.

### 4. Code Review
- Review code for quality issues.
- Fix critical issues and re-test.

### 5. Documentation
- Update docs in `./docs` if needed.
- Update progress in plan file.

### 6. Final Report
- Summary of changes.
- Guide user to get started.
- Suggest next steps.

**IMPORTANT:** Sacrifice grammar for concision.
