# Fix Filename Encoding Issue - Complete Solution

**Date:** 2026-01-22  
**Status:** In Progress  
**Priority:** HIGH

---

## Problem

File uploads result in corrupted filenames (mojibake) stored in database:
- ❌ Database: `TAI Náº N Há»\u008EA HOáº N.pdf`
- ✅ Should be: `TAI NẠN HỎA HOẠN.pdf`

## Root Cause

Multer decodes UTF-8 filenames as Latin1, causing mojibake corruption.

## Solution Overview

1. ✅ Enhanced encoding utility (already done)
2. ⏳ Verify all upload paths use encoding fix
3. ⏳ Test encoding utility with specific pattern
4. ⏳ Run migration script to fix existing data
5. ⏳ Test with real file upload
6. ⏳ Verify fix works end-to-end

## Phases

- **Phase 1:** Verify all upload paths use encoding fix
- **Phase 2:** Test encoding utility
- **Phase 3:** Run migration & verify
- **Phase 4:** End-to-end testing
