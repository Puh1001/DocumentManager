# Phase 3: Seed Data Update

**Status:** ✅ Completed

## Changes Made

1. **Updated Seed File** (`apps/api/prisma/seed.ts`)
   - Replaced 6 test departments with all 40 departments
   - Added multilingual names (EN, VI, ZH) for each department
   - Updated folder creation logic to use department codes

2. **Departments Added**
   - All 40 departments from the provided list
   - Each with proper codes, Vietnamese, English, and Chinese names
   - Physical locations assigned

3. **Update Logic**
   - Existing departments are updated with multilingual names if missing
   - New departments are created with all language fields

## Department Codes

- BOD, HCNS, KINH_DOANH, KE_TOAN, THU_MUA, IT, XNK, PTVL, PHONG_MAU, SAN_XUAT
- LTB, LTB_DAI, PHONG_KIEM_NGHIEM, NC_PT_VAI, PMC, QA, KHO, CONG_TRINH
- CONG_TRINH_DU_AN, BOC_SOI, KEO_SOI, CONG_NGHE, DET_DAI, NHUOM_DAI, QC_DAI
- DET_DOC, DET_NGANG, DET_NGANG_S, PHONG_THI_NGHIEM, NHUOM_VAI, DINH_HINH
- QC_VAI, IN_HOA, GIAI_DOAN_TRUOC_NHUOM_SOI, GIAI_DOAN_SAU_NHUOM_SOI
- CN_HUNG_YEN_DET_NGANG, CN_NGHE_AN_2_DET_NGANG, CN_HUNG_YEN_DET_DAI, MG

