# Research Report: ISO Document Management System

**Date:** 2024-12-18  
**Topic:** Technical Stack & Architecture Research

## Executive Summary

Xây dựng hệ thống quản lý tài liệu ISO theo mô hình "Thủ thư" với:

- **Backend NestJS** kết nối SMB/CIFS via `smb2` library hoặc mounted drive
- **Version control** theo cấu trúc thư mục + metadata trong PostgreSQL
- **ABAC+RBAC** hybrid authorization với CASL/Casbin
- **Document Viewer** với react-pdf-viewer + mammoth.js

## Key Findings

### 1. SMB/CIFS Integration

**Option A: SMB2 Library (Recommended)**

```bash
npm install smb2
```

- Direct SMB protocol access
- Async operations, streaming support
- No OS-level configuration needed

**Option B: Mount Drive**

- Windows: `net use Z: \\192.168.1.x\SharedFolder`
- Linux: `mount -t cifs //IP/folder /mnt/folder`
- Use standard `fs` module

**Recommendation:** Use SMB2 library for flexibility, fallback to mounted drive for performance-critical operations.

### 2. Version Control Strategy

**File Naming Convention:**

```
/documents/{docId}/
├── current/
│   └── document.pdf
└── versions/
    ├── v1_20241218_103000_{userId}.pdf
    ├── v2_20241218_153000_{userId}.pdf
    └── ...
```

**Database Schema (Prisma):**

```prisma
model DocumentVersion {
  id          String   @id @default(uuid())
  documentId  String
  version     Int
  fileName    String
  filePath    String
  checksum    String
  createdBy   String
  createdAt   DateTime @default(now())
  comment     String?

  document    Document @relation(fields: [documentId], references: [id])
  user        User     @relation(fields: [createdBy], references: [id])
}
```

### 3. Authorization (ABAC + RBAC)

**RBAC Layer:** User → Role → Permissions
**ABAC Layer:** Attribute-based rules (department, document type, time)

**Libraries:**

- **CASL** (Recommended) - Isomorphic authorization
- **Casbin** - Policy-based, more complex

**Permission Types:**

- `view` - Read content
- `download` - Download file
- `print` - Print access
- `edit` - Modify via local app
- `delete` - Remove document

### 4. Document Viewer

**PDF:** `@react-pdf-viewer/core` + `@react-pdf-viewer/default-layout`
**DOCX:** `mammoth.js` (convert to HTML)
**Other:** `@cyntler/react-doc-viewer`

**Copy Protection:**

- Disable right-click, Ctrl+C/P
- CSS user-select: none
- Watermark overlay
- Canvas-based rendering for sensitive docs

### 5. Open in Local App

**Approach:** Use custom URI protocol or direct file:// path

- Windows: `file:///Z:/path/to/file.docx`
- SMB path: `file://192.168.1.x/SharedFolder/file.docx`

**Browser Limitation:** Modern browsers block file:// protocol for security.
**Solution:** Provide download link or use custom protocol handler.

## Implementation Recommendations

1. Use mounted drive on Windows server for better performance
2. Implement CASL for authorization
3. Store file metadata in PostgreSQL, files on shared drive
4. Use streaming for large files
5. Implement watermarking for sensitive documents

## Security Considerations

- Encrypt credentials for SMB connection
- Use JWT + refresh tokens for session
- Rate limiting on file operations
- Audit logging for all document access
- HTTPS only

## Unresolved Questions

1. Maximum file size limit?
2. Supported file formats beyond PDF/DOCX?
3. Multiple concurrent editors handling?
4. Offline access requirements?
