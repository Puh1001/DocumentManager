# Phase 04: Save/Delete Functionality

## Objectives

1. Lưu calculated metric vào database khi save
2. Xóa calculated metric khi user click xóa
3. Load calculated metric từ database khi load records

## Implementation

### 1. Save Calculated Metric

**Location:** `performSave` function

Calculated metric sẽ được save tự động trong loop save metrics:

```typescript
for (const metric of record.metrics) {
  // This includes CALCULATED metrics
  await api.patch(`/kpi/metrics/${metric.id}`, {
    name: metric.name,
    type: metric.type,
    sortOrder: metric.sortOrder,
    values: JSON.stringify(metric.values || {}),
  });
}
```

**Note:** Calculated values không cần lưu vào database vì chúng được tính toán tự động từ efficiency. Chỉ cần lưu name và type.

### 2. Delete Calculated Metric

**Location:** `handleRemoveCalculatedMetric` function

```typescript
const handleRemoveCalculatedMetric = async (
  recordId: string,
  metricId: string
) => {
  if (!isEditMode) return;

  try {
    await api.delete(`/kpi/metrics/${metricId}`);
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              metrics: r.metrics.filter((m) => m.id !== metricId),
            }
          : r
      )
    );
  } catch (err: unknown) {
    handleKpiApiError(err, "xóa dòng tính toán");
  }
};
```

### 3. Load Calculated Metric

**Location:** `loadRecords` function

Calculated metric sẽ được load tự động trong metrics array từ API. Không cần xử lý đặc biệt.

## Files to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

## Testing

- [ ] Calculated metric được lưu vào database
- [ ] Calculated metric được load từ database
- [ ] Calculated metric được xóa khỏi database
- [ ] Values không được lưu (vì tính toán tự động)

