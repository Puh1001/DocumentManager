---
description: ⚡⚡ Fix bugs or issues
argument-hint: [bug-description]
---

## Purpose
Fix bugs or issues in the codebase.

## Variables
BUG_DESCRIPTION: $ARGUMENTS

## Workflow:
1. Use `/debug` to understand root cause
2. Make targeted changes to fix the issue
3. Use `/test` to verify the fix
4. Use `/review` to ensure code quality
5. Document the fix

**IMPORTANT:** Never ignore failing tests.
