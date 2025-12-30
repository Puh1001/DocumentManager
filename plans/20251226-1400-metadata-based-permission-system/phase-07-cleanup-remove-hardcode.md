# Phase 7: Cleanup - Remove Hardcode

**Date:** 2025-12-26  
**Status:** ✅ Completed  
**Priority:** P1  
**Estimated Time:** 0.5 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 2, Phase 5, Phase 6
- **Related Docs:** `docs/code-standards.md`

## Overview

Remove all hardcoded module lists, page mappings, and navigation items. Clean up unused code and update documentation.

## Key Insights

- Hardcoded module list in CaslAbilityFactory (already updated in Phase 2)
- Hardcoded page-to-module mapping in constants
- Hardcoded navigation items in sidebar (already updated in Phase 5)
- Remove unused imports and code

## Requirements

- [x] Remove `PAGE_MODULE_MAPPING` constant ✅
- [x] Remove `getModuleForPage` function (if unused) ✅
- [x] Clean up unused imports ✅
- [x] Update documentation ✅
- [x] Remove commented code ✅

## Architecture

### Files to Clean Up

1. `apps/api/src/modules/authorization/constants/page-module-mapping.ts` - Remove or deprecate
2. `apps/web/src/components/layout/sidebar.tsx` - Already updated in Phase 5
3. Any other files with hardcoded module/page lists

## Related Code Files

- ~~`apps/api/src/modules/authorization/constants/page-module-mapping.ts`~~ (deleted ✅)
- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts` (verified - dynamic ✅)
- `apps/web/src/components/layout/sidebar.tsx` (verified - dynamic ✅)

## Implementation Steps

1. Search for hardcoded module lists
2. Search for hardcoded page mappings
3. Remove unused constants
4. Remove unused functions
5. Clean up imports
6. Update documentation
7. Run tests to ensure nothing broken

## Todo List

- [x] Remove PAGE_MODULE_MAPPING ✅
- [x] Remove getModuleForPage (if unused) ✅
- [x] Clean up unused imports ✅
- [x] Update code documentation ✅
- [x] Update system architecture docs ✅
- [x] Run full test suite ✅
- [x] Verify no regressions ✅

## Success Criteria

- ✅ No hardcoded module lists
- ✅ No hardcoded page mappings
- ✅ No hardcoded navigation items
- ✅ All tests pass
- ✅ Documentation updated
- ✅ Code clean and maintainable

## Risk Assessment

| Risk                            | Probability | Impact | Mitigation          |
| ------------------------------- | ----------- | ------ | ------------------- |
| Breaking existing functionality | Low         | High   | Run full test suite |
| Missing dependencies            | Low         | Medium | Check all imports   |

## Security Considerations

- Ensure no security checks removed
- Verify permission validation still works

## Code Review

- [Review Report](./reviews/phase-07-code-review.md) ✅

## Next Steps

- ✅ All phases completed
- 🎉 Metadata-Based Permission System complete
- Ready for production deployment
