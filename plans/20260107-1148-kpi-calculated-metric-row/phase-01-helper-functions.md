# Phase 01: Helper Functions và Logic Tính Toán

## Objectives

Tạo các helper functions để:
1. Lấy calculated metric từ record
2. Tính toán calculated values (100% - efficiency)
3. Xử lý calculated metric CRUD operations

## Implementation

### 1. Helper Functions

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

```typescript
// Helper function to get calculated metric
const getCalculatedMetric = (record: KpiRecord) => {
  return record.metrics.find((m) => m.type === "CALCULATED");
};

// Helper function to calculate calculated values (100% - efficiency)
const calculateCalculatedValues = (record: KpiRecord) => {
  const efficiencyValues = calculateEfficiency(record);
  return efficiencyValues.map((v) => (v == null ? null : 100 - v));
};
```

### 2. Update ensureMetricExists

Cho phép tạo CALCULATED metric type:

```typescript
const ensureMetricExists = async (
  recordId: string,
  type: "TARGET" | "ACTUAL" | "CALCULATED"
) => {
  // ... existing code ...
};
```

### 3. Add/Remove Calculated Metric Functions

```typescript
const handleAddCalculatedMetric = async (recordId: string) => {
  // Check if already exists
  // Create new CALCULATED metric
  // Update records state
};

const handleRemoveCalculatedMetric = async (
  recordId: string,
  metricId: string
) => {
  // Delete from API
  // Update records state
};
```

## Files to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

## Testing

- [ ] getCalculatedMetric returns correct metric
- [ ] calculateCalculatedValues calculates 100 - efficiency correctly
- [ ] handleAddCalculatedMetric creates metric successfully
- [ ] handleRemoveCalculatedMetric deletes metric successfully

