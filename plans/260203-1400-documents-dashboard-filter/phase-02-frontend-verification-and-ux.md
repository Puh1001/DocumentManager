# Phase 02: Frontend Verification & UX

**Status:** Pending  
**Dependencies:** Phase 01

## Goal

Verify that the backend filter works correctly in the frontend, and ensure UX is clear that this page shows "ISO Documents" only.

## Verification Steps

### Step 1: Manual Testing

**File:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Test Cases:**

1. **ISO_documents documents appear:**
   - Navigate to `/dashboard/documents`
   - Verify documents from `{dept}/ISO_documents` folders are visible
   - Check pagination works correctly

2. **KPI documents excluded:**
   - Upload a file to a department's KPI section (via KPI module)
   - Navigate to `/dashboard/documents`
   - Verify the KPI file does NOT appear in the list

3. **Maintenance documents excluded:**
   - Upload a file to a department's Maintenance section (if Maintenance module exists)
   - Navigate to `/dashboard/documents`
   - Verify the Maintenance file does NOT appear in the list

4. **Delete_files documents excluded:**
   - Verify deleted files do NOT appear (already excluded, but confirm)

5. **Filters still work:**
   - Test status filter (ACTIVE, ARCHIVED, DELETED)
   - Test department filter
   - Test level filter
   - Verify all filters work correctly with ISO_documents-only results

6. **Pagination:**
   - If there are many ISO_documents, verify pagination works
   - Verify total count reflects only ISO_documents

### Step 2: Check for Frontend Filtering Logic

**File:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Action:** Review the code to ensure there's no frontend-side filtering that might conflict or duplicate the backend filter.

**Expected:** No frontend filtering needed - backend handles it all.

**If frontend filtering exists:**
- Remove it (defense-in-depth is fine, but not necessary)
- Or keep as defense-in-depth if it's simple and doesn't cause issues

### Step 3: UX Clarity (Optional)

**File:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Consideration:** Should the page title/description clarify that it shows "ISO Documents" only?

**Current:**
```tsx
<h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
<p className="text-muted-foreground">{t("description")}</p>
```

**Options:**
1. **No change** - Keep generic "Documents" title (users understand context)
2. **Update translation** - Change to "ISO Documents" or "ISO Documents List"
3. **Add badge/subtitle** - Add "(ISO Documents only)" subtitle

**Recommendation:** Option 1 (no change) - Keep it simple. The context is clear from the route `/dashboard/documents` and the fact that uploads go to ISO_documents folders.

### Step 4: Verify Upload Flow Still Works

**File:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Test:**
1. Click upload button
2. Select file
3. Select department (if needed)
4. Select folder from picker (should show ISO_documents folders only)
5. Upload completes
6. Verify uploaded document appears in the list immediately

**Expected:** Upload flow unchanged, new documents appear in filtered list.

## Testing Checklist

- [ ] ISO_documents documents appear in list
- [ ] KPI documents do NOT appear in list
- [ ] Maintenance documents do NOT appear in list
- [ ] Delete_files documents do NOT appear in list
- [ ] Status filter works correctly
- [ ] Department filter works correctly
- [ ] Level filter works correctly
- [ ] Pagination works correctly
- [ ] Upload flow works and new documents appear
- [ ] Real-time sync updates work correctly
- [ ] No console errors or warnings

## Expected Behavior

**User Experience:**
- User navigates to `/dashboard/documents`
- Sees only ISO documents from their department(s)
- Can filter by status, department, level
- Can upload new documents (goes to ISO_documents folder)
- Uploaded documents appear immediately in the list

## Notes

- Frontend changes are minimal - mostly verification
- Backend filter handles all the logic
- If UX needs clarification, update translations or add subtle hints

## Rollback Plan

If frontend issues arise:
1. Check browser console for errors
2. Verify API response structure hasn't changed
3. Verify filters are being passed correctly to backend
4. If needed, revert Phase 01 changes
