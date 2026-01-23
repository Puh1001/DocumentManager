# Debug Report: Reviewed By Field Missing in Rejection Dialog

**Date:** 2026-01-22  
**Issue:** "Reviewed by" field is empty in rejection dialog  
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Problem Summary

User reported:
- Rejection dialog shows "Reviewed by:" but no name appears
- Dialog displays rejection comment correctly ✅
- But reviewer information is missing ❌

---

## Root Cause

**Issue:** Frontend interface expects `reviewedBy` but backend returns `reviewer`.

**Backend Response:**
```typescript
// getRequestByDocumentId() returns:
{
  reviewer: {  // ← Backend returns "reviewer" (relation)
    id: string,
    fullName: string,
    username: string,
    // ... other User fields
  } | null
}
```

**Frontend Interface:**
```typescript
interface DeletionRequest {
  reviewedBy?: {  // ← Frontend expects "reviewedBy"
    fullName: string;
  } | null;
}
```

**Problem:**
- Backend includes `reviewer: true` in Prisma query
- Prisma returns `reviewer` object (User relation)
- Frontend checks `rejectionRequest.reviewedBy` (doesn't exist)
- Result: `reviewedBy` is undefined → No name displayed

---

## Evidence

**Backend Code:**
```typescript
// document-deletion.service.ts line 381-389
async getRequestByDocumentId(documentId: string) {
  return prisma.deletionRequest.findFirst({
    where: { documentId },
    include: {
      reviewer: true,  // ← Returns "reviewer"
      requester: true,
    },
  });
}
```

**Frontend Code:**
```typescript
// deletion-status-badge.tsx line 196-204
{rejectionRequest.reviewedBy && (  // ← Checks "reviewedBy" (doesn't exist)
  <div className="flex items-center gap-2">
    <User className="h-4 w-4 text-muted-foreground" />
    <span className="text-muted-foreground">Reviewed by:</span>
    <span className="font-medium">
      {rejectionRequest.reviewedBy.fullName}  // ← undefined.fullName
    </span>
  </div>
)}
```

**Prisma Schema:**
```prisma
model DeletionRequest {
  reviewedBy String? @map("reviewed_by")  // Field name
  reviewer   User?   @relation(...)        // Relation name
}
```

---

## Solution

**Option 1: Update Frontend Interface (Recommended)**
- Change `reviewedBy` → `reviewer` in frontend interface
- Update all references to use `reviewer` instead

**Option 2: Transform Backend Response**
- Map `reviewer` → `reviewedBy` in backend before returning
- Keep frontend interface as is

**Recommended: Option 1** - Simpler, matches Prisma schema

---

## Fix Plan

**Update Frontend:**
1. Change `DeletionRequest` interface: `reviewedBy` → `reviewer`
2. Update all references: `rejectionRequest.reviewedBy` → `rejectionRequest.reviewer`
3. Ensure `reviewer` can be null

---

## Files to Fix

1. `apps/web/src/components/documents/deletion-status-badge.tsx`
   - Update `DeletionRequest` interface
   - Change `reviewedBy` → `reviewer` in all references

---

## Expected Behavior After Fix

1. Backend returns `reviewer: { fullName: "John Doe" }` ✅
2. Frontend checks `rejectionRequest.reviewer` ✅
3. Dialog displays "Reviewed by: John Doe" ✅

---

## Status

✅ **FIXED** - Frontend interface updated to match backend response

**Implementation:**
- Changed `reviewedBy` → `reviewer` in `DeletionRequest` interface
- Updated all references to use `reviewer` instead of `reviewedBy`
- Matches Prisma schema relation name

**Files Modified:**
1. `apps/web/src/components/documents/deletion-status-badge.tsx`
   - Updated interface: `reviewedBy` → `reviewer`
   - Updated display logic: `rejectionRequest.reviewedBy` → `rejectionRequest.reviewer`

**Verification:**
- ✅ TypeScript compilation: PASSED
- ✅ Field name matches backend response

**Expected Behavior:**
- Backend returns `reviewer: { fullName: "John Doe" }` ✅
- Frontend checks `rejectionRequest.reviewer` ✅
- Dialog displays "Reviewed by: John Doe" ✅
