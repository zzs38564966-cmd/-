---
name: financial-data-integrity-and-security
description: >
  Domain-specific guidelines for personal finance data modeling, ledger integrity,
  formula injection (DDE) defense, multi-user isolation, and automated regression testing.
  Triggers on tasks involving financial ledger changes, CSV/XLSX imports, account syncing,
  security rules, or test suite expansion.
metadata:
  author: finance-engineering
  version: "1.0.0"
---

# Financial Data Integrity & Web Security Standard

## 1. Monetary Calculations & Rounding
- Never trust raw floating-point operations for currency arithmetic.
- Always normalize cents or use strict 2-decimal rounding:
  `const roundCents = (amt: number): number => Math.round((amt + Number.EPSILON) * 100) / 100;`
- Separate Ledger Estimated Balance from Bank Verified Balances clearly in the UI.

## 2. Multi-Tenant Isolation & Ownership
- Every document in Firestore must include `userId: auth.currentUser.uid`.
- Firestore security rules must enforce `request.auth.uid == userId` or `request.auth.uid == resource.data.userId`.
- No cross-tenant reads or front-end-only filtering. Unauthenticated users cannot read personal ledger entries.

## 3. Bill Import Sanitization & DDE Protection
- Prevent CSV Formula Injection: Any field beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` must be prepended with a single quote `'` or stripped.
- Prevent Cross-Site Scripting (XSS): Strip all `<script>`, `javascript:`, and HTML tags from raw notes, payees, and merchant fields before saving.
- Limit import payload size (e.g. max 8MB, max 15,000 lines) to avoid browser freeze and Denial of Service (DoS).

## 4. Deterministic Business Logic vs AI
- Real ledger transactions must NEVER be fabricated by probabilistic LLMs.
- Natural Language Input must parse into an uncommitted draft requiring explicit user confirmation.
- Merchant category classification must rely on deterministic rule chains with explicit user-customizable priorities.

## 5. Automated Regression Test Suite
- Every business rule, alert condition, and parser feature must have a corresponding test case in `src/components/IntelligentTestView.tsx`.
- Automated test runner must execute synchronously or in controlled batches to verify regression-free state on every code change.
