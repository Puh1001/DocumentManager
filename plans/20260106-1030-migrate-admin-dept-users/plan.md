# Migration Plan: Admin Dept Users

**Created:** 2026-01-06 10:30  
**Status:** 🔄 In Progress  
**Priority:** P0 - Critical

---

## Overview

Migrate 50 users from users.txt file with role `admin_dept`. Update user information to include full name and department CODE matching existing departments.

## Requirements

1. Create users from users.txt with role `admin_dept`
2. Set default password to `bpvn@123$$` for all users
3. Include full name (`fullName`) in user info
4. Map department codes from users.txt to existing department codes
5. Do NOT create new departments - use existing ones

## User Data Structure

From users.txt:

- STT: Serial number
- Họ Tên: Full name
- MNV: Employee ID (will use as username)
- Bộ phận: Department code and name

## Department Code Mapping

Map department codes from users.txt to existing codes in database:

| users.txt Code   | Description      | Existing DB Code          |
| ---------------- | ---------------- | ------------------------- |
| YDF              | Sau nhuộm sợi    | GIAI_DOAN_SAU_NHUOM_SOI   |
| TL               | Kiểm nghiệm      | PHONG_KIEM_NGHIEM         |
| WH               | Kho              | KHO                       |
| SHD              | Xuất nhập khẩu   | XNK                       |
| PMC              | PMC              | PMC                       |
| PUR              | Thu mua          | THU_MUA                   |
| PW               | Trước nhuộm sợi  | GIAI_DOAN_TRUOC_NHUOM_SOI |
| SS               | Định hình        | DINH_HINH                 |
| PT               | In Hoa           | IN_HOA                    |
| WK               | Dệt Ngang        | DET_NGANG                 |
| EG               | Công Trình       | CONG_TRINH                |
| SD               | Kinh Doanh       | KINH_DOANH                |
| Qc vải           | QC vải           | QC_VAI                    |
| WA               | Dệt Dọc          | DET_DOC                   |
| QA               | QA               | QA                        |
| QC đai           | QC đai           | QC_DAI                    |
| AC               | Kế Toán          | KE_TOAN                   |
| DH               | Nhuộm vải        | NHUOM_VAI                 |
| WV               | Dệt Đai          | DET_DAI                   |
| WS               | WS               | MG                        |
| DF               | Nhuộm đai        | NHUOM_DAI                 |
| LTB              | LTB              | LTB                       |
| Phòng thí nghiệm | Phòng thí nghiệm | PHONG_THI_NGHIEM          |
| CV               | Bọc sợi          | BOC_SOI                   |
| WD               | Kéo sợi          | KEO_SOI                   |
| HR               | Nhân sự          | HCNS                      |
| IT               | Công nghệ        | IT                        |

## Implementation Steps

### Phase 1: Create Migration Script

- Parse users.txt file
- Map department codes
- Hash password
- Create user records
- Assign admin_dept role

### Phase 2: Execute Migration

- Run migration script
- Validate data
- Check for errors

### Phase 3: Verification

- Verify all 50 users created
- Verify role assignments
- Test login with one user

## Technical Details

- **ORM:** Prisma
- **Database:** PostgreSQL
- **Password Hashing:** Argon2
- **Default Password:** `bpvn@123$$`
- **Role:** `admin_dept`
- **Email Format:** `{username}@bpvn.com`

## Files to Create/Modify

1. `apps/api/prisma/seeds/migrate-admin-dept-users.ts` - Migration script
2. `apps/api/package.json` - Add migration script command (optional)

## Success Criteria

- [ ] All 50 users created successfully
- [ ] Each user has correct fullName
- [ ] Each user has correct department code
- [ ] Each user has admin_dept role assigned
- [ ] All users can login with default password
- [ ] No duplicate usernames or emails
- [ ] No new departments created

## Risks & Mitigations

**Risk:** Username conflicts with existing users  
**Mitigation:** Check for existing users and skip/update accordingly

**Risk:** Department code mapping errors  
**Mitigation:** Manual review of mapping table before execution

**Risk:** Password hash errors  
**Mitigation:** Test password hashing before bulk operation

## Rollback Plan

If migration fails:

1. Delete all users created in this migration
2. Delete role assignments
3. Re-run with fixes

## Notes

- User department field is a string, not foreign key
- admin_dept role should already exist with permissions configured
- Username will be employee ID (MNV) in lowercase
