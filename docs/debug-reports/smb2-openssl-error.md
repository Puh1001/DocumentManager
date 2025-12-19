# Debug Report: SMB2 OpenSSL Error

**Date:** 2024-12-18  
**Issue:** `ERR_OSSL_EVP_UNSUPPORTED` khi khởi tạo SMB2 client

## Problem Summary

Backend API crash với lỗi OpenSSL khi SMB service cố gắng kết nối đến SMB share:

```
Error: error:0308010C:digital envelope routines::unsupported
code: 'ERR_OSSL_EVP_UNSUPPORTED'
```

## Root Cause Analysis

### 5 Whys Analysis

1. **Why does the error occur?**
   - SMB2 library sử dụng NTLM authentication
   - NTLM cần MD4 và DES encryption algorithms

2. **Why are these algorithms unavailable?**
   - Node.js 17+ đã remove support cho legacy OpenSSL algorithms (MD4, DES)
   - Node.js 22.21.0 (version hiện tại) không hỗ trợ các algorithms này

3. **Why does SMB2 need these algorithms?**
   - `smb2` library dependency `ntlm` sử dụng `createCipheriv` với DES
   - File: `node_modules/ntlm/lib/smbhash.js:46`

4. **Why wasn't the flag applied?**
   - `NODE_OPTIONS=--openssl-legacy-provider` đã bị xóa khỏi root `package.json`
   - Flag chỉ cần cho API (backend), không cần cho frontend

5. **Why does it happen on startup?**
   - `onModuleInit()` delay 2s rồi gọi `testConnection()`
   - `testConnection()` → `listDirectory()` → `ensureClient()` → `new SMB2()`
   - Lỗi xảy ra tại `new SMB2()` khi tạo NTLM hash

## Evidence

### Error Stack Trace

```
at Cipheriv.createCipherBase (node:internal/crypto/cipher:121:19)
at Object.createCipheriv (node:crypto:143:10)
at D:\documentsManager\node_modules\ntlm\lib\smbhash.js:46:22
at Object.encodeType3 (D:\documentsManager\node_modules\ntlm\lib\ntlm.js:106:3)
at Object.generate (D:\documentsManager\node_modules\smb2\lib\messages\session_setup_step2.js:20:23)
```

### Code Flow

1. `SmbService.onModuleInit()` (line 76)
2. `setTimeout(() => testConnection(), 2000)` (line 79)
3. `testConnection()` → `listDirectory("")` (line 103)
4. `listDirectory()` → `ensureClient()` (line 103)
5. `ensureClient()` → `new SMB2(config)` (line 109) **← ERROR HERE**

### Configuration Status

- ✅ SMB credentials có trong config
- ❌ `NODE_OPTIONS` flag không có trong `apps/api/package.json`
- ✅ Lazy initialization đã implement
- ❌ Flag bị xóa khỏi root `package.json`

## Fix Plan

### Solution 1: Add NODE_OPTIONS to API dev script (Recommended)

**File:** `apps/api/package.json`

```json
{
  "scripts": {
    "dev": "cross-env NODE_OPTIONS=--openssl-legacy-provider nest start --watch"
  }
}
```

**Pros:**

- Chỉ ảnh hưởng API, không ảnh hưởng frontend
- Không cần thay đổi root config
- Rõ ràng và maintainable

**Cons:**

- Cần install `cross-env` (đã có)

### Solution 2: Use environment variable

Set `NODE_OPTIONS` trong `.env` hoặc system environment:

```bash
NODE_OPTIONS=--openssl-legacy-provider
```

**Pros:**

- Không cần thay đổi code

**Cons:**

- Phải set cho mỗi developer
- Dễ quên

### Solution 3: Alternative SMB library

Tìm library khác không cần legacy OpenSSL:

- `node-smb2` (có thể cũng có vấn đề tương tự)
- Direct file system access (nếu backend chạy trên Windows server)

**Pros:**

- Không cần legacy provider

**Cons:**

- Cần refactor code
- Có thể không support domain auth tốt

## Recommended Fix

**Implement Solution 1** - Thêm flag vào API dev script.

## Implementation

1. Update `apps/api/package.json` dev script
2. Verify `cross-env` đã install
3. Test SMB connection sau khi fix

## Verification

Sau khi fix, verify:

- ✅ API start không crash
- ✅ SMB connection test pass (nếu có credentials)
- ✅ Frontend vẫn hoạt động bình thường
