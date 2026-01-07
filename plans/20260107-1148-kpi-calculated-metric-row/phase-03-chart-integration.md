# Phase 03: Chart Integration

## Objectives

Đồ thị sẽ vẽ theo calculated values nếu có, nếu không thì vẽ theo efficiency values.

## Implementation

### 1. Determine Chart Data Source

**Location:** Trong phần render của record

```typescript
const efficiencyValues = calculateEfficiency(record);
const calculatedMetric = getCalculatedMetric(record);
const calculatedValues = calculatedMetric
  ? calculateCalculatedValues(record)
  : null;

// Use calculated values for chart if available, otherwise use efficiency
const chartValues = calculatedValues || efficiencyValues;
const hasData = chartValues.some((v) => v != null);
```

### 2. Update Chart Title

**Location:** Chart card title

```typescript
<h2 className="text-sm font-semibold mb-4">
  {calculatedMetric
    ? calculatedMetric.name || t("chartTitle")
    : t("chartTitle")}
</h2>
```

### 3. Update Chart Data and Options

**Location:** Bar chart component

```typescript
<Bar
  options={getChartOptions(
    chartValues,
    record.targetValue
  )}
  data={getChartData(record, chartValues)}
/>
```

## Files to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

## Testing

- [ ] Chart vẽ theo calculated values khi có calculated metric
- [ ] Chart vẽ theo efficiency khi không có calculated metric
- [ ] Chart title hiển thị tên calculated metric nếu có
- [ ] Chart scale xử lý đúng với calculated values

