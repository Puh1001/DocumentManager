# Phase 3: Frontend UI

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 2 (API)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Update frontend to support displayType selection and conditional rendering.

## Changes

### Type Definitions

Update KpiRecord interface:

```typescript
interface KpiRecord {
  // ... existing fields ...
  displayType: "PERCENTAGE" | "COUNT";
}
```

### UI Components

1. **Add Table Dialog**: Add radio/select for displayType
2. **Table Rendering**: Conditionally show rows based on displayType
3. **Chart Logic**: Different calculation for COUNT tables

### Display Logic

**COUNT Table:**

- Show only TARGET and ACTUAL rows
- Hide CALCULATED row
- Chart bars = ACTUAL values
- Chart line = TARGET values
- Y-axis auto-scales to data range

**PERCENTAGE Table:**

- Show TARGET, ACTUAL, CALCULATED rows (existing)
- Chart bars = efficiency %
- Chart line = targetValue threshold
- Y-axis typically 0-100%

### Chart Data Function

```typescript
const getChartDataForCountTable = (record: KpiRecord) => {
  const targetMetric = record.metrics.find((m) => m.type === "TARGET");
  const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

  const actualData = MONTH_KEYS.map((key) => actualMetric?.values[key] ?? 0);
  const targetData = MONTH_KEYS.map((key) => targetMetric?.values[key] ?? 0);

  return {
    labels: [
      ...MONTH_KEYS.map((k) => tTable(`months.${k}`)),
      tTable("months.average"),
    ],
    datasets: [
      {
        type: "bar",
        label: "Actual",
        data: [...actualData, calculateMetricAverage(actualMetric)],
        backgroundColor: "rgba(54, 162, 235, 0.8)",
      },
      {
        type: "line",
        label: "Target",
        data: [...targetData, calculateMetricAverage(targetMetric)],
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
      },
    ],
  };
};
```

## Implementation Steps

- [ ] Update KpiRecord interface to include displayType
- [ ] Add displayType selector in "Add Table" dialog
- [ ] Conditionally render rows based on displayType
- [ ] Create separate chart data logic for COUNT tables
- [ ] Update chart options for dynamic Y-axis scaling
- [ ] Add i18n translations
- [ ] Test both table types

## Files to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`
- `apps/web/messages/en/*.json` (i18n)
- `apps/web/messages/vi/*.json`
- `apps/web/messages/zh/*.json`

## i18n Keys to Add

```json
{
  "kpi": {
    "displayType": "Display Type",
    "percentageTable": "Percentage Table",
    "countTable": "Count Table",
    "actual": "Actual",
    "target": "Target"
  }
}
```

## Success Criteria

- [ ] User can select displayType when adding table
- [ ] COUNT tables show only 2 rows
- [ ] Charts display correctly for both types
- [ ] Translations work in all languages
