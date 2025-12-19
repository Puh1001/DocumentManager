---
description: ⚡⚡ Update project documentation
argument-hint: [doc-scope]
---

## Purpose

Update project documentation using the `docs-manager` agent.

## Variables

DOC_SCOPE: $ARGUMENTS (optional - specific docs to update)

## Workflow:

1. **Identify Documentation Needs**
   - Check for code changes that need documentation
   - Review existing docs for accuracy
   - Identify gaps in documentation

2. **Update Documentation**
   - Sync docs with code changes
   - Update API documentation
   - Maintain README files
   - Update architecture docs if needed

3. **Documentation Structure**
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

4. **Quality Check**
   - Verify accuracy of documented information
   - Check for broken links
   - Ensure consistency in style

**IMPORTANT:** Keep documentation concise and actionable.
