# Plan: KPI Calculated Metric Row (100% - Efficiency)

**Date:** 2026-01-07  
**Feature:** Thêm dòng tính toán optional trong KPI table với công thức 100% - Efficiency

## Overview

Thêm tính năng cho phép user thêm một dòng tính toán (calculated metric) vào KPI table:

- Dòng này có công thức: **100% - Efficiency**
- User có thể nhập tên cho dòng này
- Đồ thị sẽ được vẽ theo dòng này (nếu có), nếu không thì vẽ theo Efficiency
- Dòng này là optional - user tự thêm khi cần

## Requirements

1. **UI Components:**
   - Button "Thêm dòng tính toán" (chỉ hiện khi edit mode và chưa có calculated metric)
   - Row hiển thị calculated values (100% - efficiency) trong table
   - Button xóa dòng tính toán

2. **Logic:**
   - Tính toán: `calculatedValue = 100 - efficiency` cho mỗi tháng
   - Chart sử dụng calculated values nếu có, nếu không dùng efficiency
   - Lưu calculated metric vào database (type: CALCULATED)

3. **Data Flow:**
   - Load calculated metric từ API (nếu có)
   - Tự động tính toán values từ efficiency
   - Save calculated metric name và type

## Phases

1. **Phase 01:** Helper functions và logic tính toán
2. **Phase 02:** UI - Thêm button và row hiển thị
3. **Phase 03:** Chart integration - Vẽ theo calculated values
4. **Phase 04:** Save/Delete functionality
5. **Phase 05:** Testing và validation

## Success Criteria

- [ ] User có thể thêm calculated metric row
- [ ] Values tự động tính = 100% - efficiency
- [ ] Chart vẽ theo calculated values nếu có
- [ ] User có thể xóa calculated metric
- [ ] Data được lưu và load đúng từ database
