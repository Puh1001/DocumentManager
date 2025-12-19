# ANTIGRAVITY.md

This file provides guidance to **Antigravity** (Google Gemini AI) when working with code in this repository.

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## Workflows

- Primary workflow: `./.antigravity/workflows/primary-workflow.md`
- Development rules: `./.antigravity/workflows/development-rules.md`
- And other workflows: `./.antigravity/workflows/*`

**IMPORTANT:** Analyze the skills catalog at `./.claude/skills/*` and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `./.antigravity/workflows/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT**: For `YYMMDD` dates, use `Get-Date -UFormat "%y%m%d"` (PowerShell) or `date +%y%m%d` (bash).

## Slash Commands (Prompts)

Use these prompts to trigger specific workflows:
- `/plan` - Create implementation plan
- `/cook` - Implement a feature step by step
- `/scout` - Search codebase for relevant files
- `/test` - Run tests and validate code
- `/review` - Code review
- `/docs` - Update documentation
- `/fix` - Fix bugs or issues
- `/debug` - Debug and analyze issues

**Note:** In Antigravity, use prompts from `./.antigravity/prompts/` directory.

## Documentation Management

We keep all important docs in `./docs` folder:

```
./docs
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

## Skills Reference

All skills are located at `./.claude/skills/*` - this is shared between all agents (Claude Code, Antigravity, Cursor).

**IMPORTANT:** *MUST READ* and *MUST COMPLY* all *INSTRUCTIONS* in project `./ANTIGRAVITY.md`, especially *WORKFLOWS* section is *CRITICALLY IMPORTANT*, this rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS. MUST REMEMBER AT ALL TIMES!!!*
