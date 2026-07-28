# PAYSAVE App Shell Layout

## Structure

```text
features/app-shell/
├── domain/
│   ├── breadcrumbs.ts
│   └── navigation.ts
└── presentation/
    ├── app-shell.tsx
    ├── sidebar.tsx
    ├── header.tsx
    ├── app-breadcrumb.tsx
    ├── notification-menu.tsx
    ├── profile-menu.tsx
    ├── theme-toggle.tsx
    ├── navigation-icons.ts
    └── dashboard-preview.tsx
```

## Responsive behavior

- Desktop `lg+`: fixed 288px sidebar, sticky glass header and fluid content area.
- Tablet: sidebar moves into an accessible Sheet; header retains breadcrumb and actions.
- Mobile: 16px page gutter, compact profile, horizontally scrollable tables and 44px minimum controls.
- Content max width: 1600px.

## Security and data scope

- Sidebar items are filtered from verified JWT permissions.
- Role names alone never expose navigation.
- Notifications, profile and dashboard values are mock data and do not query a database.
- `/preview/layout` is blocked by default. It is accessible only when `PAYSAVE_ENABLE_DESIGN_PREVIEW=true` is set for local visual QA.

## Shadcn primitives

The layout uses PAYSAVE variants of Shadcn/Radix primitives from `@paysave/ui`: Avatar, Badge, Breadcrumb, Button, Card, Dropdown Menu, Separator, Sheet, Table and Dialog.

## Dark mode

`next-themes` applies a class to the root document. Design tokens switch semantic colors and shadows in `.dark`; components consume semantic tokens rather than hardcoded page colors.
