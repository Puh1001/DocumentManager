## Implementation steps

1. Refactor layout wrapper in `apps/web/src/app/[locale]/dashboard/documents/page.tsx`:
   - Replace `flex items-center justify-between` row with a responsive container:
     - Filters block
     - Actions block (refresh/sync/upload + deleted badge)
2. If needed, lightly adjust `DocumentToolbar` internal layout to support:
   - `flex-wrap` / `grid` on small screens
   - Consistent heights for inputs/buttons
3. Ensure `Upload vào phòng ban` selector aligns well and doesn’t squeeze other controls.

## TODO checklist

- [ ] Update wrapper layout in `documents/page.tsx` (responsive + badge placement)
- [ ] Refactor `DocumentToolbar` layout (grid, consistent sizing, no random wrapping)
- [ ] Ensure mobile has no horizontal scroll (320/375) + keyboard focus visible
- [ ] Run type-check/build for `apps/web`

## Acceptance checklist

- No functional changes (filters/upload/sync/pagination same behavior).
- No horizontal scroll on mobile.
- Keyboard navigation works; focus rings visible.
- Deleted badge remains discoverable and doesn’t break layout.
