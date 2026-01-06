# Multilingual Department Management

**Date:** 2026-01-06  
**Status:** 🔲 In Progress  
**Priority:** High

---

## Overview

Add 40 departments to the system with full multilingual support (English-Vietnamese-Chinese). Update existing test departments to match the correct list.

## Requirements

1. Add all 40 departments from the provided list
2. Support multilingual names (EN, VI, ZH)
3. Update existing test departments (HR, IT, PR, SD, QC, PD) to match correct names
4. Frontend displays department names based on current locale

## Architecture Decision

**Approach:** Store multilingual names in separate database fields

- `nameEn`: English name
- `nameVi`: Vietnamese name
- `nameZh`: Chinese name
- Keep `name` field for backward compatibility (defaults to Vietnamese)

**Rationale:**

- Simpler than JSONB for querying
- Direct field access for each language
- Easy to update individual languages
- Maintains backward compatibility

## Departments List

40 departments to be added/updated:

1. BOD - 总经办BOD
2. HCNS - 人力资源部HCNS
3. Kinh doanh - 营业部Kinh doanh
4. Kế toán - 财务部Kế toán
5. Thu mua - 采购部Thu mua
6. Phòng thông tin - 资讯科技部IT
7. Xuất nhập khẩu - 船务部 XNK
8. Phát triển vật liệu - 材料开发部Phát triển vật liệu
9. Phòng mẫu - 板房Phòng mẫu
10. Sản xuất - 生产部Sản xuất
    ... (and 30 more)

## Phases

1. **Database Schema Update** - Add multilingual name fields
2. **Migration** - Create and run migration
3. **API Updates** - Update DTOs and service
4. **Seed Data** - Add all 40 departments with translations
5. **Frontend Updates** - Display names based on locale
6. **Testing** - Verify all departments and languages

---

**Next:** See phase-01-database-schema.md
