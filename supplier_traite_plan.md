# Supplier Traite Implementation Plan (§5.9)

## Overview
Integration of supplier payment tracking with a focus on "Traites" (promissory notes) and 120-day échéance projections.

## Phase 1: Backend Infrastructure
- [x] Add `GetByCounterpartId` to `DocumentController` for optimized filtering.
- [ ] Verify `PaymentInstruments` table existence in PostgreSQL (Critical: current error `relation "PaymentInstruments" does not exist`).
- [ ] Ensure `PaymentRepository.GetEcheancesAsync` maps to the correct table/schema.

## Phase 2: Frontend Services & Models
- [x] Update `DocumentService` with `GetByCounterpartId`.
- [x] Correct `Supplier` type usage: `Provider` instead of `CounterPart`.
- [x] Implement `EcheanceDetailDto` and `SupplierEcheanceDto` in `payment.ts`.

## Phase 3: Dashboard Implementation (`SupplierPaymentsComponent`)
- [x] Standalone component architecture.
- [x] KPI Dashboard: Total Unpaid, Overdue, Upcoming Traites, Remaining Balance.
- [x] 120-Day Projection Chart using Chart.js.
- [x] Filterable supplier selection with `mat-autocomplete`.
- [x] Integration with `PaymentModalComponent` for creating new payments.
- [x] "Mark as Paid in Bank" functionality for traites.

## Phase 4: Traite Payment Form Refinement
- [x] Real-time conflict detection (échéance overlap warning).
- [x] Debounced search for existing échéances on date selection.
- [x] Pulse animation for critical warnings.
- [x] Validation for bank details and amounts.

## Phase 5: Verification & Polish
- [x] Fixed template parsing errors (`{{supplier.name}}`).
- [ ] Fix database relation issue (`PaymentInstruments`).
- [ ] Final UI audit for premium aesthetics and dark mode consistency.
