---
description: ⚡⚡ Scout given directories to respond to the user's requests
argument-hint: [user-prompt] [scale]
---

## Purpose

Search the codebase for files needed to complete the task using a fast, token efficient approach.

## Variables

USER_PROMPT: $1
SCALE: $2 (defaults to 3)
REPORT_OUTPUT_DIR: `plans/<plan-name>/reports/scout-report.md`

## Workflow:

- Spawn multiple search agents in parallel to search the codebase based on the user's prompt.
- Analyze and divide folders for each agent to scout intelligently and quickly.
- This isn't about a full blown search, just a quick search to find the files needed to complete the task.
- Use a timeout of 3 minutes for each agent's search. Skip any that don't return within the timeout.

**How to write reports:**

- **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
- **IMPORTANT:** In reports, list any unresolved questions at the end, if any.
- Report should include: file paths found, brief description of each file's purpose, relevance to the task.
