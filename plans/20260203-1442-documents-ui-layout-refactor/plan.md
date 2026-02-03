## Goal

Refactor bố cục UI trang `/dashboard/documents` để gọn hơn, dễ scan hơn, responsive tốt hơn, nhưng vẫn giữ “design language” hiện tại (shadcn/ui + Tailwind, style tối giản, spacing/typography theo dashboard).

## Non-goals

- Không thay đổi API/data flow của documents.
- Không đổi chức năng / hành vi upload/sync/filter/pagination.
- Không thêm thư viện UI mới.

## Key changes (expected)

- Toolbar chuyển sang layout “2-row responsive”: hàng 1 (filters), hàng 2 (actions: refresh/sync/upload + badge deleted).
- Giảm nguy cơ overflow trên màn hình nhỏ; các control wrap hợp lý, đảm bảo click targets + focus ring.
- Card list giữ nguyên style, chỉ chỉnh spacing/padding nhất quán.

## TODO

- Audit `DocumentToolbar` + trang `page.tsx`: xác định vùng đang overflow/khó dùng.
- Apply layout mới (grid + gap) và đảm bảo không thay đổi props/behavior.
- Verify responsive (sm/md/lg) + keyboard accessibility.
- Run typecheck/build web.
