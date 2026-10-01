# History

## 2026-10-01

- Cloned repo `KhanhChung2k5/Shopee`.
- Validated Jira API credentials successfully. Token was exposed in chat, so it should be rotated outside the repo.
- Created and pushed `backup-main` from original `main`.
- Pulled latest `test` branch.
- Confirmed `test` is the shared integration branch before merging to `main`.
- Created `feature/p4-payment-marketing` from latest `test` at commit `42de30d`.
- Added `project-memory/` so future AI/dev work can read context before coding.
- Owner confirmed implementation order, simulated payment, department permissions and checkpoint commits; start with wallet top-up.
- Committed project memory (`afe6dd0`). Implemented wallet API and buyer profile wallet view; targeted backend tests, web build and lint pass (lint has pre-existing warnings). Database integration remains to be verified with PostgreSQL.
- Committed wallet checkpoint (`01d68b7`). Added program/voucher CRUD backend and admin UI; targeted tests and web build/lint pass. Database integration still requires PostgreSQL.
- Committed program/voucher checkpoint (`7a639fa`). Added SKU/flash sale and invoice discount CRUD with admin forms and validation. P2 variant search and P3 checkout integration remain external dependencies.
- Committed discount-detail checkpoint (`55efafe`). Added buyer voucher quote preview with eligibility and capped discount; targeted unit tests pass.

## Notes

- P1 implementation on `test` appears mostly complete for auth/profile/employee permission.
- Full backend integration test could not be confirmed locally because PostgreSQL/Docker was unavailable.
- Frontend build may fail on Node 20.9 because current Vite stack requires Node >= 20.19.
