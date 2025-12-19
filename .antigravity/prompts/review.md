---
description: ⚡⚡ Review code for quality and best practices
argument-hint: [files-or-scope]
---

## Purpose

Perform code review using the `code-reviewer` agent.

## Variables

REVIEW_SCOPE: $ARGUMENTS (optional - specific files or commits to review)

## Workflow:

1. **Identify Review Scope**
   - If scope provided, focus on those files
   - If no scope, review recent changes

2. **Perform Review**
   - Check against `./docs/code-standards.md`
   - Analyze for security vulnerabilities
   - Check performance implications
   - Verify architectural compliance

3. **Generate Report**
   - Summary: Overall assessment
   - Critical Issues: Must-fix before merge
   - Suggestions: Nice-to-have improvements
   - Positive Feedback: What was done well

**IMPORTANT:** Be constructive and educational in feedback.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
