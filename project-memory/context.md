# Context

## Repo

- Project: Cho Tot Mua - CRM + ecommerce ban tay cam, dia game, phu kien.
- Backend: Spring Boot, JPA/Hibernate, Flyway, PostgreSQL.
- Frontend: React + Vite.
- Main docs: `docs/project-overview.md`, `crm-ecommerce-class-diagram.md`, `docs/phan-quyen-he-thong.md`.

## Branches

- `main`: ban on dinh cuoi cung.
- `test`: nhanh tich hop chung. Moi P merge vao day de test truoc khi len `main`.
- `feature/p4-payment-marketing`: nhanh dang lam P4, tach tu `test` tai commit `42de30d`.

## Current Baseline From P1/Test

- Auth da co register/login bang JWT va BCrypt.
- JWT co claim `role` va `department`.
- `User.role`: `buyer` hoac `staff`.
- `Employee.department`: `sales`, `warehouse`, `admin`, `cs`.
- `/employees/**` da chan backend cho `DEPT_ADMIN`.
- Frontend da co `AuthContext`, `apiFetch`, `RequireStaff`, `RequireDepartment`.
- Schema hien co 39 bang, gom ca cac bang P4: `payments`, `wallet_transactions`, `refund_returns`, `promotion_programs`, `promotion_product_details`, `promotion_invoice_details`, `vouchers`, `voucher_usages`, `promotion_product_applications`, `promotion_invoice_applications`, `loyalty_transactions`, `reviews`.

## Important Constraints

- Khong sua tiep `V1__init_schema.sql` neu khong bat buoc. Neu can doi DB sau khi da co baseline, tao migration moi `V2__...sql`, `V3__...sql`.
- Backend module Phase 2-5 chua co day du. P4 co the code truoc cac phan doc lap, nhung luong checkout/refund that se phu thuoc P2/P3.
- May hien tai khong co Docker, nhung co PostgreSQL 14/Homebrew; co the tao cluster tam trong `/tmp` de chay full Maven tests/Flyway/JPA validation.
- Frontend build can Node >= 20.19. Trong `web/`, shell mac dinh dung Node 20.9; chay bang Node 24.18 tai `/Users/nguyenquochuy/.nvm/versions/node/v24.18.0/bin` khi build/lint.
