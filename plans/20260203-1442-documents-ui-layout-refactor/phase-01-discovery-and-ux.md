## Current layout (from `/dashboard/documents`)

- Header (title + description)
- Row: `DocumentToolbar` + deleted badge (destructive)
- Card: list + pagination

## UX issues to address

- Horizontal toolbar density: filters + actions compete; wrapping can look random.
- Deleted badge placement: can get lost or push layout.
- Mobile: controls should stack with clear grouping and consistent alignment.

## Constraints

- Must match existing dashboard visual style.
- Keep existing components where possible (YAGNI/KISS).
