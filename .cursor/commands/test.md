---
description: ⚡⚡ Run tests and validate code
argument-hint: [test-scope]
---

## Purpose
Run tests and validate code quality.

## Variables
TEST_SCOPE: $ARGUMENTS (optional)

## Workflow:
1. Run test suite: `npm test`, `yarn test`, etc.
2. Generate coverage report if available
3. Analyze results for failures
4. Report: Tests run/passed/failed, coverage metrics, recommendations

**IMPORTANT:** Never ignore failing tests.
