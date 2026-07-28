# PAYSAVE OS — Frontend Sprint #2 Report

**Sprint:** Frontend Sprint #2  
**Business Capability:** Recovery Management  
**Version:** 1.0  
**Date:** 2026-07-22  
**Status:** PASS WITH DEPENDENCY ADVISORY  
**Deployment:** Not deployed

## 1. Executive Summary

Frontend Sprint #2 ส่งมอบ Recovery Management แบบ feature-first โดยใช้ Mock API/Mock Repository และ React Query เท่านั้น ไม่มีการเชื่อม Supabase, PostgreSQL หรือ Database ใด ๆ และไม่มีการ Deploy

เส้นทางหลักผ่าน unit, type, lint, architecture, production build, Playwright workflow, Axe accessibility, responsive และ dark-mode verification แล้ว Browser QA ยืนยันว่าไม่มี external network request, console error หรือ page error

## 2. Scope Matrix

| Capability                  | Result        | Evidence                                                                    |
| --------------------------- | ------------- | --------------------------------------------------------------------------- |
| Case List                   | PASS          | TanStack Table, search, stage filter, KPI summary, empty state              |
| Case Detail                 | PASS          | Contract/customer overview, DPD, outstanding, owner and actions             |
| Assignment Screen           | PASS          | Case and agent selection, capacity badges, mutation status                  |
| Timeline                    | PASS          | Status, contact, visit, promise and approval events                         |
| Field Visit                 | PASS          | Accessible dialog, mock mutation and timeline update                        |
| GPS Map                     | PASS          | Responsive inline SVG mock map; no external map/tile request                |
| Contact Attempt             | PASS          | Channel/outcome/note workflow and mutation verification                     |
| Promise To Pay              | PASS          | Amount/date/note workflow and case-status update                            |
| Approval Dialog             | PASS          | Required reason, approve/reject flow and accessible focus behavior          |
| Document Viewer             | PASS          | Mock document pages, next/previous controls, Escape close                   |
| Asset Information           | PASS          | Vehicle identity, masked serial, condition and valuation                    |
| Responsive                  | PASS          | Desktop 1440×1000 and mobile 390×844                                        |
| Dark Mode                   | PASS          | Recovery Case Detail and mobile Case List verified                          |
| Accessibility               | PASS          | Axe serious/critical = 0 after contrast correction                          |
| Skeleton Loading            | PASS          | Segment loading UI and React Query loading state                            |
| Optimistic UI               | PASS          | Assignment list updates before Mock API response; rollback context retained |
| Mock Repository             | PASS          | Isolated per-instance state and mutation tests                              |
| Database/Supabase isolation | PASS          | Source scan 0 matches; browser external requests 0                          |
| Deployment                  | NOT PERFORMED | Requirement complied with                                                   |

## 3. Routes

```text
/recovery/cases
/recovery/cases/[caseId]
/recovery/assignments
```

Mock-only middleware classification was extended to `/recovery/*`; existing backend API and auth routes keep their original authorization behavior.

## 4. Architecture

```text
apps/web/src/features/recovery-management/
├── domain/
│   └── recovery-case.ts
├── application/
│   ├── ports/recovery-repository.ts
│   └── query-keys.ts
├── infrastructure/mock/
│   ├── mock-recovery-repository.ts
│   └── mock-recovery-repository.test.ts
├── presentation/
│   ├── recovery-query-provider.tsx
│   ├── use-recovery.ts
│   ├── case-list-view.tsx
│   ├── case-detail-view.tsx
│   ├── assignment-view.tsx
│   ├── case-table.tsx
│   ├── timeline.tsx
│   ├── gps-map.tsx
│   ├── action-dialogs.tsx
│   ├── document-viewer.tsx
│   ├── asset-card.tsx
│   └── recovery-skeleton.tsx
└── index.ts
```

Architecture boundary check: **PASS**

## 5. Mock Data and Repository

`MockRecoveryRepository` exposes asynchronous contracts for:

- `listCases`
- `getCase`
- `listAgents`
- `assignCase`
- `addContactAttempt`
- `createPromiseToPay`
- `recordFieldVisit`
- `resolveApproval`

The repository simulates latency and returns cloned data. Unit tests prove that a mutation in one repository instance does not alter a separate instance.

Mock fixtures include 8 recovery cases, 4 agents, masked customer data, assets, timelines, contacts, field visits, promises, approvals and documents.

## 6. React Query and Optimistic UI

React Query v5 provides:

- Query cache for cases, case detail and agent capacity
- Mutation state for contact, promise, field visit and approval workflows
- Optimistic assignment update before repository response
- Previous cache snapshots for rollback on failure
- Cache synchronization between Case List and Case Detail after successful mutation

Browser QA initially discovered that optimistic assignment depended on Case Detail already being cached. The hook was corrected so Assignment Screen updates Case List directly when entered as the first Recovery route. Playwright then verified the visible `Optimistic update` state before the 450 ms Mock API response.

## 7. Responsive and Visual QA

### Desktop

- Clear page hierarchy and consistent Recovery navigation
- Readable KPI, Case Table, Timeline and two-column detail layout
- Assignment selection and agent capacity are visually distinct
- No clipping or document-level horizontal overflow

### Mobile

- Header and sidebar use accessible mobile navigation
- KPI cards stack into one column
- TanStack Table has a minimum width and horizontal scrolling
- Case ID remains on one line
- A mobile-only instruction explains horizontal scrolling
- Controls meet the 44 px target convention

### Visual evidence

```text
docs/frontend/evidence/frontend-sprint-2/
├── 01-case-list-desktop.png
├── 02-case-detail-desktop.png
├── 03-assignment-desktop.png
├── 04-case-detail-dark.png
├── 05-case-list-mobile.png
├── 06-mobile-navigation.png
└── qa-results.json
```

## 8. Accessibility

Verified with Playwright and `@axe-core/playwright`:

- Case List desktop: serious/critical 0
- Case Detail desktop: serious/critical 0
- Assignment desktop: serious/critical 0
- Document Viewer dialog: serious/critical 0
- Case Detail dark mode: serious/critical 0
- Case List mobile: serious/critical 0

Additional behavior verified:

- Dialog titles and descriptions
- Labelled form fields
- Keyboard/Escape dialog close behavior
- `aria-pressed` selection states
- `aria-live` mutation feedback
- Accessible table name and keyboard-accessible scroll region
- Focus-visible styles
- Light/dark semantic contrast

A light-mode warning status originally measured 4.38:1. The warning token was corrected and the final Axe run passed.

## 9. Quality Gates

### Automated tests

| Suite               |  Passed |
| ------------------- | ------: |
| Architecture tests  |       9 |
| Web tests           |     220 |
| Observability tests |       3 |
| Security tests      |      19 |
| Testing package     |       2 |
| UI tests            |       9 |
| **Total**           | **262** |

### Static and build gates

| Gate                     | Result |
| ------------------------ | ------ |
| TypeScript               | PASS   |
| ESLint                   | PASS   |
| Architecture boundaries  | PASS   |
| Next.js production build | PASS   |
| Recovery first-load JS   | 197 kB |

### Browser QA

```text
Status:            PASS
Checks:            6
External requests: 0
Console errors:    0
Page errors:       0
Document overflow: 0
```

## 10. Database and Supabase Isolation

Source scan under `features/recovery-management` returned zero matches for:

```text
supabase
database
postgres
createClient
```

GPS Map is an inline SVG and does not request Google Maps, Mapbox, OpenStreetMap tiles or another external service. Documents are visual mock pages and are not downloaded from a storage provider.

## 11. Known Dependency Advisory

`npm audit --omit=dev` reports transitive dependencies owned by the pinned Next.js 15.5.20 line:

- `postcss <8.5.10`: moderate
- `sharp <0.35.0`: two high findings

The npm force-fix recommendation would install Next.js 9.3.3, which is a breaking downgrade and conflicts with the required Next.js 15 stack. No force fix was applied. This advisory must remain on the production-readiness register until the Next.js 15 dependency chain provides a compatible fix.

The Recovery feature does not use server-side image processing, image upload or external document ingestion.

## 12. Constraints and Limitations

- Mock state resets when the page/provider is recreated
- GPS Map is illustrative and not a real navigation service
- Document Viewer renders mock pages and not actual PDFs/images
- No live authorization, persistence, audit trail or background workflow is invoked
- No Supabase or Database integration was performed
- No Production or Staging deployment was performed

## 13. Final Result

**Frontend Sprint #2: COMPLETE — READY FOR REVIEW**

Result: **PASS WITH DEPENDENCY ADVISORY**
