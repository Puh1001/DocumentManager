---
description: ⚡⚡ Fix bugs or issues
argument-hint: [bug-description]
---

## Purpose

Fix bugs or issues in the codebase.

## Variables

BUG_DESCRIPTION: $ARGUMENTS

## Workflow:

1. **Analyze the Bug**
   - Use `/debug` to understand the root cause
   - Review error logs and stack traces
   - Identify affected components

2. **Implement Fix**
   - Make targeted changes to fix the issue
   - Follow code standards in `./docs/code-standards.md`
   - Ensure backward compatibility

3. **Test the Fix**
   - Use `/test` to run relevant tests
   - Verify the fix doesn't introduce regressions
   - Check edge cases

4. **Review**
   - Use `/review` to ensure code quality
   - Get approval before merging

5. **Document**
   - Update changelog if needed
   - Document the fix for future reference

**IMPORTANT:** Never ignore failing tests just to pass the build.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
