# Phase 1: Analysis & Mapping

**Status:** DRAFT  
**Dependencies:** None  

---

## Official Department List (dept.txt - 32 departments)

| # | Code | English Name | Vietnamese Name |
|---|------|--------------|-----------------|
| 1 | V-Tech | | Công nghệ |
| 2 | SD | Sales Dept. | Kinh doanh |
| 3 | HR | Human Resource Dept. | HCNS (Hành chính Nhân sự) |
| 4 | AC | Accounting Dept. | Kế toán |
| 5 | PMC | Production Material Control | Kế hoạch sản xuất |
| 6 | WA | Warping & Knitting Dept. | Dệt dọc |
| 7 | EG | Engineering Dept. | Công trình |
| 8 | WH | Warehouse Dept. | Kho |
| 9 | QA | Quality Assurance | QA |
| 10 | QC(E) | Elastic Quality Control | QC đai |
| 11 | IT | Information Technology | Thông tin |
| 12 | PUR | Purchasing Dept. | Thu mua |
| 13 | CV | Covering | Bọc sợi |
| 14 | WD | Warping Dept. | Kéo sợi |
| 15 | DCC | Document Control Center | Kiểm soát văn kiện |
| 16 | WK | Weft Knitting Dept. | Dệt ngang |
| 17 | IE | Industry Engineering Dept. | Công trình dự án |
| 18 | DH | Fabric Dyeing | Nhuộm vải |
| 19 | DF | Elastic Dyeing | Nhuộm đai |
| 20 | SS | Scouring and Setting | Định hình |
| 21 | SHD | Shipping Dept. | Xuất nhập khẩu |
| 22 | PT | Printing Dept. | In hoa |
| 23 | LTB(F) | Fabric Little to bulk | LTB vải |
| 24 | YDF | Yarn Weaving and Finishing | Nhuộm sợi |
| 25 | BOD | Board of Director | Ban giám đốc |
| 26 | WV | Elastic Weaving Dept. | Dệt đai |
| 27 | PW | Preceding & Weaving | GĐ Trước nhuộm sợi |
| 28 | QC(F) | Fabric Quality Control | QC vải |
| 29 | LAB | Laboratory | Thí nghiệm |
| 30 | TL | Testing Laboratory | Kiểm nghiệm |
| 31 | RD | Research and Development | Nghiên cứu và phát triển |
| 32 | LTB(E) | Elastic Little to bulk | LTB đai |

---

## Current Database Departments (seed.ts - 39 departments)

| # | Current Code | Current nameVi |
|---|--------------|----------------|
| 1 | BOD | BOD |
| 2 | HCNS | HCNS |
| 3 | KINH_DOANH | Kinh doanh |
| 4 | KE_TOAN | Kế toán |
| 5 | THU_MUA | Thu mua |
| 6 | IT | Phòng thông tin |
| 7 | XNK | Xuất nhập khẩu |
| 8 | PTVL | Phát triển vật liệu |
| 9 | PHONG_MAU | Phòng mẫu |
| 10 | SAN_XUAT | Sản xuất |
| 11 | LTB | LTB |
| 12 | LTB_DAI | LTB đai |
| 13 | PHONG_KIEM_NGHIEM | Phòng kiểm nghiệm |
| 14 | NC_PT_VAI | Nghiên cứu phát triển vải |
| 15 | PMC | PMC |
| 16 | QA | QA |
| 17 | KHO | Kho |
| 18 | CONG_TRINH | Công trình |
| 19 | CONG_TRINH_DU_AN | Công trình dự án |
| 20 | BOC_SOI | Bọc sợi |
| 21 | KEO_SOI | Kéo sợi |
| 22 | CONG_NGHE | Công nghệ |
| 23 | DET_DAI | Dệt đai |
| 24 | NHUOM_DAI | Nhuộm đai |
| 25 | QC_DAI | QC đai |
| 26 | DET_DOC | Dệt dọc |
| 27 | DET_NGANG | Dệt ngang |
| 28 | DET_NGANG_S | Dệt ngang - S |
| 29 | PHONG_THI_NGHIEM | Phòng thí nghiệm |
| 30 | NHUOM_VAI | Nhuộm vải |
| 31 | DINH_HINH | Định hình |
| 32 | QC_VAI | QC vải |
| 33 | IN_HOA | In hoa |
| 34 | GIAI_DOAN_TRUOC_NHUOM_SOI | Giai đoạn trước nhuộm sợi |
| 35 | GIAI_DOAN_SAU_NHUOM_SOI | Giai đoạn sau nhuộm sợi |
| 36 | CN_HUNG_YEN_DET_NGANG | Chi nhánh Hưng Yên - Dệt ngang |
| 37 | CN_NGHE_AN_2_DET_NGANG | Chi nhánh Nghệ An 2 - Dệt ngang |
| 38 | CN_HUNG_YEN_DET_DAI | Chi nhánh Hưng Yên - Dệt đai |
| 39 | MG | MG |

---

## Mapping: Current DB → Official

### ✅ Matched Departments (32 records to UPDATE)

| Current Code | Current nameVi | → | New Code | New name | New nameVi | New nameEn |
|--------------|----------------|---|----------|----------|------------|------------|
| BOD | BOD | → | BOD | BOD-Ban giám đốc | Ban giám đốc | Board of Director |
| HCNS | HCNS | → | HR | HR-HCNS (Hành chính Nhân sự) | HCNS (Hành chính Nhân sự) | Human Resource Dept. |
| KINH_DOANH | Kinh doanh | → | SD | SD-Kinh doanh | Kinh doanh | Sales Dept. |
| KE_TOAN | Kế toán | → | AC | AC-Kế toán | Kế toán | Accounting Dept. |
| THU_MUA | Thu mua | → | PUR | PUR-Thu mua | Thu mua | Purchasing Dept. |
| IT | Phòng thông tin | → | IT | IT-Thông tin | Thông tin | Information Technology |
| XNK | Xuất nhập khẩu | → | SHD | SHD-Xuất nhập khẩu | Xuất nhập khẩu | Shipping Dept. |
| PMC | PMC | → | PMC | PMC-Kế hoạch sản xuất | Kế hoạch sản xuất | Production Material Control |
| QA | QA | → | QA | QA-QA | QA | Quality Assurance |
| KHO | Kho | → | WH | WH-Kho | Kho | Warehouse Dept. |
| CONG_TRINH | Công trình | → | EG | EG-Công trình | Công trình | Engineering Dept. |
| CONG_TRINH_DU_AN | Công trình dự án | → | IE | IE-Công trình dự án | Công trình dự án | Industry Engineering Dept. |
| BOC_SOI | Bọc sợi | → | CV | CV-Bọc sợi | Bọc sợi | Covering |
| KEO_SOI | Kéo sợi | → | WD | WD-Kéo sợi | Kéo sợi | Warping Dept. |
| CONG_NGHE | Công nghệ | → | V-Tech | V-Tech-Công nghệ | Công nghệ | (empty in dept.txt) |
| DET_DAI | Dệt đai | → | WV | WV-Dệt đai | Dệt đai | Elastic Weaving Dept. |
| NHUOM_DAI | Nhuộm đai | → | DF | DF-Nhuộm đai | Nhuộm đai | Elastic Dyeing |
| QC_DAI | QC đai | → | QC(E) | QC(E)-QC đai | QC đai | Elastic Quality Control |
| DET_DOC | Dệt dọc | → | WA | WA-Dệt dọc | Dệt dọc | Warping & Knitting Dept. |
| DET_NGANG | Dệt ngang | → | WK | WK-Dệt ngang | Dệt ngang | Weft Knitting Dept. |
| PHONG_THI_NGHIEM | Phòng thí nghiệm | → | LAB | LAB-Thí nghiệm | Thí nghiệm | Laboratory |
| NHUOM_VAI | Nhuộm vải | → | DH | DH-Nhuộm vải | Nhuộm vải | Fabric Dyeing |
| DINH_HINH | Định hình | → | SS | SS-Định hình | Định hình | Scouring and Setting |
| QC_VAI | QC vải | → | QC(F) | QC(F)-QC vải | QC vải | Fabric Quality Control |
| IN_HOA | In hoa | → | PT | PT-In hoa | In hoa | Printing Dept. |
| LTB | LTB | → | LTB(F) | LTB(F)-LTB vải | LTB vải | Fabric Little to bulk |
| LTB_DAI | LTB đai | → | LTB(E) | LTB(E)-LTB đai | LTB đai | Elastic Little to bulk |
| PHONG_KIEM_NGHIEM | Phòng kiểm nghiệm | → | TL | TL-Kiểm nghiệm | Kiểm nghiệm | Testing Laboratory |
| NC_PT_VAI | Nghiên cứu phát triển vải | → | RD | RD-Nghiên cứu và phát triển | Nghiên cứu và phát triển | Research and Development |
| GIAI_DOAN_TRUOC_NHUOM_SOI | Giai đoạn trước nhuộm sợi | → | PW | PW-GĐ Trước nhuộm sợi | GĐ Trước nhuộm sợi | Preceding & Weaving |
| GIAI_DOAN_SAU_NHUOM_SOI | Giai đoạn sau nhuộm sợi | → | YDF | YDF-Nhuộm sợi | Nhuộm sợi | Yarn Weaving and Finishing |

**Missing from official list (need to add):**
- DCC (Document Control Center - Kiểm soát văn kiện) - **FOUND in official list #15!**

### 🔍 Unmatched Departments (7 records NOT in official list)

These departments exist in DB but NOT in official dept.txt. Need decision on whether to deactivate or keep.

| Current Code | Current nameVi | Status | Action |
|--------------|----------------|--------|--------|
| PTVL | Phát triển vật liệu | ❓ | REVIEW - not in official list |
| PHONG_MAU | Phòng mẫu | ❓ | REVIEW - not in official list |
| SAN_XUAT | Sản xuất | ❓ | REVIEW - not in official list |
| DET_NGANG_S | Dệt ngang - S | ❓ | REVIEW - seems like sub-dept of DET_NGANG |
| CN_HUNG_YEN_DET_NGANG | Chi nhánh Hưng Yên - Dệt ngang | ❓ | REVIEW - branch office dept |
| CN_NGHE_AN_2_DET_NGANG | Chi nhánh Nghệ An 2 - Dệt ngang | ❓ | REVIEW - branch office dept |
| CN_HUNG_YEN_DET_DAI | Chi nhánh Hưng Yên - Dệt đai | ❓ | REVIEW - branch office dept |
| MG | MG | ❓ | REVIEW - unclear what this is |

**Note:** If user said there are 45 rows but seed.ts has 39, there may be 6 additional departments created manually. Need to query actual database to confirm.

---

## Missing from DB (1 record to CREATE)

| Official Code | Vietnamese Name | English Name | Action |
|---------------|-----------------|--------------|--------|
| DCC | Kiểm soát văn kiện | Document Control Center | CREATE (if doesn't exist) |

---

## Data Quality Issues Found

1. **Code format inconsistency**: 
   - Official uses short codes like `V-Tech`, `QC(E)`, `LTB(F)`
   - DB uses descriptive codes like `CONG_NGHE`, `QC_DAI`, `LTB_DAI`
   - **Impact**: Folder paths may use these codes - breaking change!

2. **Name field format**:
   - Current: `name = "BOD"` or `name = "Kinh doanh"` (inconsistent)
   - Target: `name = "BOD-Ban giám đốc"` (Code-Vietnamese)

3. **English name missing for V-Tech**:
   - dept.txt shows empty English name for V-Tech
   - Need clarification or use "Technology Dept."

4. **Possible duplicate**: 
   - `GIAI_DOAN_SAU_NHUOM_SOI` mapped to `YDF` but description differs
   - Official: "Yarn Weaving and Finishing" 
   - Current: "Giai đoạn sau nhuộm sợi" = "Post-dyeing Yarn Section"
   - Need confirmation these are the same department

5. **Branch offices (CN_*)**:
   - 3 branch office departments in DB
   - Not in official list
   - Decision needed: Keep or merge into main departments?

---

## Recommended Actions

### Immediate Actions (Phase 2)

1. **Query actual database** to get all 45 rows (not just seed.ts 39)
2. **Verify unmatched departments** have no active KPI records, folders, maintenance notices
3. **Clarify with stakeholders**:
   - Should branch office departments be kept?
   - What is "MG" department?
   - Is `PTVL`, `PHONG_MAU`, `SAN_XUAT` still in use?

### Migration Strategy

**Option A: Conservative (RECOMMENDED)**
- Update 32 matched departments (code + name format)
- Keep 7 unmatched departments active (for now)
- Create 1 missing department (DCC if doesn't exist)
- Flag unmatched for manual review

**Option B: Aggressive**
- Update 32 matched departments
- Deactivate 7 unmatched departments (`is_active = false`)
- Create 1 missing department
- Risk: May lose data if departments are still in use

---

## Next Steps

1. Run database query to get actual current state (all 45 rows)
2. Get stakeholder approval on unmatched departments
3. Proceed to Phase 2: Migration Scripts
