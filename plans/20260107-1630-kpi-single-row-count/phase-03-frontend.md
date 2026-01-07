# Phase 3: Frontend UI

**Status:** 🔲 Pending

---

## Changes

### 1. Type Updates

```typescript
type RowMode = "SINGLE" | "DOUBLE";

interface KpiRecord {
  // ... existing ...
  rowMode?: RowMode;
}
```

### 2. Dialog UI

```
[ ] Percentage (%)
[x] Count (Number)
    [x] 1 dòng (chỉ ACTUAL)
    [ ] 2 dòng (TARGET + ACTUAL)
```

### 3. Table Rendering

```typescript
// PERCENTAGE: Show TARGET, ACTUAL, Efficiency
// COUNT + DOUBLE: Show TARGET, ACTUAL
// COUNT + SINGLE: Show ACTUAL only
```

### 4. Chart Logic

```typescript
// COUNT + SINGLE
const getChartDataForCountSingle = (record: KpiRecord) => {
  const actualMetric = record.metrics.find(m => m.type === 'ACTUAL');
  
  return {
    datasets: [
      {
        type: 'bar',
        label: 'ACTUAL',
        data: actualData,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      }
    ]
  };
};
```

## Implementation

- [ ] Update KpiRecord interface
- [ ] Add nested radio in dialog
- [ ] Conditional TARGET row rendering
- [ ] Chart function for SINGLE mode
- [ ] Update i18n translations

