---
description: ⚡⚡ Run tests and validate code quality
argument-hint: [test-scope]
---

## Purpose

Run tests and validate code quality using the `tester` agent.

## Variables

TEST_SCOPE: $ARGUMENTS (optional - specific test files or modules to test)

## Workflow:

1. **Identify Test Scope**
   - If scope provided, focus on those files/modules
   - If no scope, run full test suite

2. **Run Tests**
   - Execute: `npm test`, `yarn test`, `pnpm test`, or project-specific command
   - Generate coverage report if available

3. **Analyze Results**
   - Parse test output for failures
   - Check coverage metrics
   - Identify flaky tests

4. **Report**
   - Test Results Overview: Total tests run, passed, failed, skipped
   - Coverage Metrics: Line, branch, function coverage
   - Failed Tests: Detailed error messages
   - Recommendations: How to fix failures

**IMPORTANT:** Never ignore failing tests just to pass the build.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
