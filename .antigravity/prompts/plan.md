---
description: ⚡⚡⚡ Intelligent plan creation with prompt enhancement
argument-hint: [task]
---

## Your mission
<task>
$ARGUMENTS
</task>

## Workflow
- Analyze the given task and ask for more details if needed.
- Activate `planning` skill from `.claude/skills/planning/`.
- Use multiple `researcher` subagents to explore approaches in parallel.
- Create comprehensive implementation plan in `./plans/YYYYMMDD-HHmm-plan-name/` directory.

## Plan Structure
- `plan.md` - Overview (under 80 lines)
- `phase-XX-phase-name.md` - Detailed phases with:
  - Context links
  - Overview with date/priority/statuses
  - Key Insights
  - Requirements
  - Architecture
  - Related code files
  - Implementation Steps
  - Todo list
  - Success Criteria
  - Risk Assessment
  - Security Considerations
  - Next steps

## Important Notes
**IMPORTANT:** Analyze the skills catalog at `.claude/skills/*` and activate the skills that are needed.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT:** **Do not** start implementing.
