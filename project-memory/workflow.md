# Workflow

## Branch Flow

1. Lam tung P tren nhanh rieng, vi du `feature/p4-payment-marketing`.
2. Thuong xuyen cap nhat tu `test`:

```bash
git checkout test
git pull --ff-only
git checkout feature/p4-payment-marketing
git merge test
```

3. Khi P4 on:

```bash
git checkout test
git pull --ff-only
git merge feature/p4-payment-marketing
sh ./mvnw test
git push origin test
```

4. Chi merge `test` vao `main` khi ca nhom da test chung.

## Merge Safety Rules

- Khong code truc tiep tren `test` tru khi dang tich hop.
- Khong sua cung luc cac file chung neu khong can thiet: `V1__init_schema.sql`, `SecurityConfig.java`, `App.tsx`, `admin/access.ts`.
- Neu can them endpoint backend moi, phai ro endpoint nao cho buyer, endpoint nao cho staff department nao.
- Neu API phu thuoc P khac, tao contract ro rang bang DTO/request/response thay vi doan truc tiep logic cua P do.
- Truoc khi merge, chay unit test backend lien quan. Neu full test can DB ma moi truong khong co PostgreSQL, ghi ro trong final/log.

## Security Pattern

- Buyer endpoint: lay user tu JWT principal, khong nhan `userId` tu client neu khong can.
- Staff endpoint: chan theo department o backend, khong chi an UI frontend.
- Marketing/voucher/flash sale: du kien `DEPT_SALES` hoac `DEPT_ADMIN`.
- Refund approval: du kien `DEPT_CS` hoac `DEPT_ADMIN`.
- Employee management: da co `DEPT_ADMIN`.
