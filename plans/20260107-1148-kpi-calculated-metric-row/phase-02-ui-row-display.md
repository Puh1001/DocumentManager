# Phase 02: UI - Thêm Button và Row Hiển Thị

## Objectives

1. Thêm button "Thêm dòng tính toán" trong UI
2. Hiển thị calculated metric row trong table
3. Cho phép edit tên calculated metric
4. Thêm button xóa calculated metric

## Implementation

### 1. Add Button

**Location:** Trong phần footer của table card, bên cạnh "Add new table" button

```typescript
{isEditMode && !calculatedMetric && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleAddCalculatedMetric(record.id)}
    title="Thêm dòng tính toán (100% - Efficiency)"
  >
    + Thêm dòng tính toán
  </Button>
)}
```

### 2. Display Calculated Row

**Location:** Sau Efficiency row, trước closing `</tbody>`

```typescript
{/* Calculated Row (100% - Efficiency) - Optional */}
{calculatedMetric && calculatedValues && (
  <tr className="bg-blue-50 font-medium">
    <td className="border border-gray-200 px-2 py-1 text-left text-xs">
      <div className="flex items-center gap-2">
        <textarea
          className="flex-1 resize-none bg-transparent text-xs leading-tight"
          value={calculatedMetric.name}
          disabled={!isEditMode}
          onChange={async (e) => {
            // Update metric name
          }}
          placeholder="Nhập tên dòng tính toán (ví dụ: Tỷ lệ lỗi)"
          rows={2}
        />
        {isEditMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveCalculatedMetric(record.id, calculatedMetric.id)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            title="Xóa dòng tính toán"
          >
            ×
          </Button>
        )}
      </div>
    </td>
    {calculatedValues.slice(0, 12).map((v, idx) => (
      <td key={MONTH_KEYS[idx]} className="border border-gray-200 px-1 py-1 text-center text-xs">
        {v == null ? "" : `${v.toFixed(2)}%`}
      </td>
    ))}
    <td className="border border-gray-200 px-1 py-1 text-center text-xs font-semibold">
      {calculatedAverage != null ? `${calculatedAverage.toFixed(2)}%` : ""}
    </td>
  </tr>
)}
```

## Files to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

## Testing

- [ ] Button hiển thị đúng khi edit mode và chưa có calculated metric
- [ ] Row hiển thị đúng values (100% - efficiency)
- [ ] Có thể edit tên calculated metric
- [ ] Có thể xóa calculated metric
- [ ] Values tự động update khi efficiency thay đổi

