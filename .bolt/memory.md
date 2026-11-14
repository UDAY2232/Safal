# Project memory

## Product intent & audience

- Enterprise business management platform for **Safal Export and Import Pvt Ltd**
- Core modules: purchase order management, employee wages, expense claims, financial tracking
- Audience: internal users — employees, managers, finance/admin staff

## Brand personality & voice

- Branded as **SAFAL**; professional, trustworthy enterprise tone
- Green primary brand color throughout the UI

## Visual design & UX direction

- SAFAL visual system: green sidebar, header branding, card-based layouts
- Styled components: tables, forms, modals, charts, status badges, notifications
- Responsive layout with mobile menu support
- Two CSS layers: **base SAFAL layout/design rules** + page-specific rules; base layer must remain present or classes fail to render
- Global UI constraints (Tailwind, Lucide icons, `@/` path alias, production-quality design) are defined in `.bolt/prompt`

## Decisions, constraints & rationale

- Stack: Vite + React
- Path alias `@/` → `src/`
- Build verification expected to pass: lint, type check, production build
- Avoid adding UI theme/icon packages beyond what `.bolt/prompt` permits

## Open questions & assumptions

- Backend/API integration approach unspecified (project described full-stack but only frontend stack confirmed)
- Auth and role-based access model not yet defined
- Data persistence / state management approach unknown
- Exact module list and page routes may still be expanding