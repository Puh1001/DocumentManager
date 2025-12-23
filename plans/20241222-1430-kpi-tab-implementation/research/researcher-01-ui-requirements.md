# Research Report: UI Requirements Analysis

## Image Analysis

### Table Structure (Image 1)

- **Header Row**: Department selector (部门/Bộ phận) - e.g., "转机部 chuyển máy dệt dây đai-V-TECH"
- **Section Title**: User-defined KPI name (一、梭织转机效率 Hiệu quả chuyển máy dệt thoi)
- **Target Display**: User-defined target (目标 Mục tiêu：≥85%)
- **Monthly Columns**: 12 months (1月份-12月份 / Tháng 1-Tháng 12) + Average column (平均达成率 / Trung bình)
- **Metric Rows**:
  - Row 1: 理论转机数量 / Số máy cần chuyển (máy) - Target values
  - Row 2: 转机实际 / Số máy thực tế chuyển (máy) - Actual values
  - Row 3: 梭织转机效率 / Hiệu suất chuyển máy dệt thoi (%) - Calculated efficiency

### Chart Structure (Image 2)

- Bar chart showing efficiency by month
- Y-axis: 0-100% scale
- X-axis: 12 months + Average
- Color coding: Yellow (<80%), Blue (80-100%), Green (>100% or average)

## UI Requirements

### 1. Department Selector

- Dropdown list from existing departments
- Update table header on change

### 2. KPI Title & Target

- Editable text input for title
- Editable text input for target (e.g., "≥85%")

### 3. Data Table

- Fixed columns: Month (1-12) + Average
- Fixed row labels: Mục (user-defined metrics)
- Editable cells for numeric values
- Auto-calculated efficiency row
- Auto-calculated average column

### 4. Chart

- Real-time update on data change
- Bar chart with Chart.js
- Conditional color based on target

### 5. Actions

- Edit mode toggle
- Save button
- Excel export (table + chart)
- Add/Remove metric rows

## Technology Stack (Already Available)

- `chart.js@^4.5.1` - Chart rendering
- `react-chartjs-2@^5.3.1` - React wrapper
- `exceljs@^4.4.0` - Excel generation
- `@radix-ui/react-tabs` - Tab component
- ShadcnUI components - UI elements
