# Test Plan: Department Folder Structure Logic

**Date:** 2026-01-23  
**Purpose:** Test logic "nếu dept chưa có thư mục thì tạo, nếu có rồi thì dùng"

---

## Test Scenarios

### Scenario 1: Department chưa có folder structure

**Setup:**
- Department mới chưa có folder structure trong database
- Chưa có physical folders trên SMB

**Test Steps:**
1. Upload KPI attachment cho department mới
2. Upload document vào Documents folder
3. Delete một file

**Expected Results:**
- ✅ Department root folder được tạo: `{dept.code}/`
- ✅ KPI folder được tạo: `{dept.code}/KPI/`
- ✅ KPI/current folder được tạo: `{dept.code}/KPI/current/`
- ✅ KPI/version folder được tạo: `{dept.code}/KPI/version/`
- ✅ Documents folder được tạo: `{dept.code}/Documents/`
- ✅ Documents/current folder được tạo: `{dept.code}/Documents/current/`
- ✅ Documents/version folder được tạo: `{dept.code}/Documents/version/`
- ✅ Maintenance folder được tạo: `{dept.code}/Maintenance/`
- ✅ Maintenance/current folder được tạo: `{dept.code}/Maintenance/current/`
- ✅ Maintenance/version folder được tạo: `{dept.code}/Maintenance/version/`
- ✅ Deleted files folder được tạo: `{dept.code}/Deleted files/`
- ✅ Physical folders được tạo trên SMB
- ✅ Database records được tạo

---

### Scenario 2: Department đã có folder structure

**Setup:**
- Department đã có folder structure trong database
- Physical folders đã tồn tại trên SMB

**Test Steps:**
1. Upload KPI attachment cho department này
2. Upload document vào Documents folder
3. Delete một file

**Expected Results:**
- ✅ Sử dụng folder structure hiện có (không tạo mới)
- ✅ Không có duplicate folders
- ✅ Files được lưu vào đúng folders

---

### Scenario 3: Department có một phần folder structure

**Setup:**
- Department có department root folder
- Chưa có KPI, Documents, Maintenance folders

**Test Steps:**
1. Upload KPI attachment
2. Upload document

**Expected Results:**
- ✅ Sử dụng department root folder hiện có
- ✅ Tạo các subfolders còn thiếu (KPI, Documents, Maintenance)
- ✅ Tạo current/ và version/ subfolders

---

### Scenario 4: Race condition (multiple requests cùng lúc)

**Setup:**
- Department chưa có folder structure
- Multiple requests cùng tạo folder structure

**Test Steps:**
1. Gửi 3 requests upload KPI attachment cùng lúc
2. Gửi 2 requests upload document cùng lúc

**Expected Results:**
- ✅ Không có duplicate folders
- ✅ Race condition được handle đúng (P2002 error catch)
- ✅ Tất cả requests thành công

---

## Test Cases

### Test Case 1: KPI Attachment Upload

```typescript
// Test: Upload KPI attachment cho department mới
const kpiRecord = await createKpiRecord({ departmentId: 'new-dept-id' });
const file = createMockFile('test.pdf');

// Should auto-create folder structure
const attachment = await kpiAttachmentService.uploadAttachment(
  kpiRecord.id,
  file,
  undefined, // folderId not provided
  undefined,
  user
);

// Verify:
// - Department folder structure created
// - File saved to {dept.code}/KPI/current/
// - Version saved to {dept.code}/KPI/version/
```

### Test Case 2: Document Upload to Documents

```typescript
// Test: Upload document to Documents folder
const folderStructure = await folderService.ensureDepartmentFolderStructure(deptId);
const file = createMockFile('document.pdf');

const document = await documentService.upload(
  folderStructure.documentsCurrent, // Use Documents/current folder
  file,
  userId
);

// Verify:
// - File saved to {dept.code}/Documents/current/
// - Version saved to {dept.code}/Documents/version/
```

### Test Case 3: File Deletion

```typescript
// Test: Delete file moves to Deleted files folder
const document = await createDocument({ folderId: kpiCurrentFolderId });
await deletionService.selfDelete(document.id, userId);

// Verify:
// - File moved to {dept.code}/Deleted files/
// - Database record updated
// - Physical file moved on SMB
```

### Test Case 4: Reuse Existing Folders

```typescript
// Test: Reuse existing folder structure
// First upload
await kpiAttachmentService.uploadAttachment(kpiRecord1.id, file1, undefined, undefined, user);

// Second upload (should reuse existing folders)
await kpiAttachmentService.uploadAttachment(kpiRecord2.id, file2, undefined, undefined, user);

// Verify:
// - No duplicate folders created
// - Both files in same KPI/current folder
```

---

## Manual Testing Steps

### 1. Test với Department mới

```bash
# 1. Tạo department mới trong database
# 2. Upload KPI attachment
curl -X POST http://localhost:3001/api/kpi/records/{kpiId}/attachments \
  -H "Authorization: Bearer {token}" \
  -F "file=@test.pdf"

# 3. Kiểm tra folder structure trên SMB
# 4. Kiểm tra database records
```

### 2. Test với Department đã có

```bash
# 1. Chọn department đã có folder structure
# 2. Upload file
# 3. Verify không tạo duplicate folders
```

### 3. Test Race Condition

```bash
# 1. Gửi multiple requests cùng lúc
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/kpi/records/{kpiId}/attachments \
    -H "Authorization: Bearer {token}" \
    -F "file=@test$i.pdf" &
done
wait

# 2. Verify không có duplicate folders
```

---

## Verification Checklist

- [ ] Department root folder created/found correctly
- [ ] KPI folder created/found correctly
- [ ] KPI/current folder created/found correctly
- [ ] KPI/version folder created/found correctly
- [ ] Documents folder created/found correctly
- [ ] Documents/current folder created/found correctly
- [ ] Documents/version folder created/found correctly
- [ ] Maintenance folder created/found correctly
- [ ] Maintenance/current folder created/found correctly
- [ ] Maintenance/version folder created/found correctly
- [ ] Deleted files folder created/found correctly
- [ ] Physical folders exist on SMB
- [ ] Database records created correctly
- [ ] No duplicate folders
- [ ] Race conditions handled
- [ ] Files saved to correct locations
- [ ] Version history works correctly
- [ ] File deletion moves to Deleted files folder

---

## Expected Folder Structure

```
{dept.code}/
├── KPI/
│   ├── current/          ← KPI attachments stored here
│   └── version/          ← KPI version history
├── Documents/
│   ├── current/          ← Regular documents stored here
│   └── version/          ← Document version history
├── Maintenance/
│   ├── current/          ← Maintenance files stored here
│   └── version/          ← Maintenance version history
└── Deleted files/        ← Deleted files moved here
```

---

## Notes

- Logic: "Nếu chưa có thì tạo, nếu có rồi thì dùng"
- Method: `folderService.ensureDepartmentFolderStructure(departmentId)`
- Tạo cả physical folders trên SMB và database records
- Handle race conditions với P2002 error catch
- Tự động tạo toàn bộ cấu trúc folder cho department
