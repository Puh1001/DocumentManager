# Phase 4: Chart & Excel Export

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 3 (Frontend Page)  
**Status:** 🔲 Pending <!-- Chart image embedding to Excel still open -->
**Priority:** Medium

---

## Overview

Implement real-time updating bar chart and Excel export with table + chart.

## Requirements

1. Bar chart matching design (monthly efficiency + average)
2. Real-time updates when data changes
3. Conditional colors based on target
4. Excel export with formatted table
5. Chart image embedded in Excel

## Architecture

### Chart Component

```
KpiChart
├── Chart.js Bar component
├── Dynamic data updates
├── Color coding logic
└── Responsive sizing
```

### Export Flow

```
User clicks Export →
API generates Excel with ExcelJS →
Client downloads file
```

## Related Files

- `apps/web/src/components/kpi/kpi-chart.tsx` - Chart component
- `apps/api/src/modules/kpi/services/kpi-export.service.ts` - Excel generation

## Implementation Steps

### Chart Implementation

- [x] Install Chart.js dependencies (already in package.json)
- [x] Configure chart options (bar, axes, colors) in `dashboard/kpi/page.tsx`
- [x] Implement real-time data binding (chart updates when table values change)
- [x] Add conditional color logic

> Ghi chú: Đã triển khai trực tiếp trong `page.tsx` thay vì tách `kpi-chart.tsx`.

### Excel Export Implementation

- [x] Add ExcelJS to API package.json
- [x] Create kpi-export.service.ts
- [x] Build Excel workbook with formatting (header, merged cells, borders)
- [ ] Add chart to Excel (or as image) <!-- deferred -->
- [x] Create export endpoint
- [x] Add download handler in frontend

## Key Implementation Details

### Chart.js Configuration

```typescript
const options: ChartOptions<'bar'> = {
  responsive: true,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value) => `${value}%`,
      },
    },
  },
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: '梭织转机效率\nHiệu suất chuyển máy dệt thoi (%)',
    },
  },
};

const data: ChartData<'bar'> = {
  labels: ['1月份 Tháng 1', ..., '平均达成率 Trung bình'],
  datasets: [{
    data: efficiencyValues,
    backgroundColor: efficiencyValues.map(v => getBarColor(v, target)),
  }],
};
```

### Color Logic (matching design)

```typescript
function getBarColor(value: number | null, target: number): string {
  if (value === null) return "transparent";
  if (value >= 100) return "#4F81BD"; // Blue (exceeds 100%)
  if (value >= target) return "#FFFF00"; // Yellow (meets target)
  return "#92D050"; // Green (below target) - or adjust per design
}
```

### Excel Export with ExcelJS

```typescript
async exportToExcel(recordId: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('KPI Report');

  // Header
  worksheet.mergeCells('A1:N1');
  worksheet.getCell('A1').value = `部门Bộ phận: ${department.name}`;

  // Title row
  worksheet.mergeCells('A2:G2');
  worksheet.getCell('A2').value = record.title;
  worksheet.getCell('H2').value = `目标 Mục tiêu: ${record.target}`;

  // Column headers (months)
  const headers = ['项目Mục', ...months, '平均达成率 Trung bình'];
  worksheet.addRow(headers);

  // Data rows
  for (const metric of metrics) {
    worksheet.addRow([metric.name, ...monthValues, average]);
  }

  // Styling
  worksheet.columns.forEach(col => { col.width = 12; });

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

## Success Criteria

- [x] Chart displays correctly with all months
- [x] Chart updates in real-time on input
- [x] Colors match design (yellow, blue, green)
- [x] Excel export downloads successfully
- [x] Excel contains formatted table
- [x] Excel styling matches design (merged headers, borders, column widths)

## Todo List

- [ ] Add chart to Excel file (optional / deferred)
