# Module CRM — v1.0

Module chăm sóc khách hàng của **Chợ Tốt Mua**: hồ sơ CRM / RFM, phân khúc, chiến dịch in-app, khảo sát, hội thoại CSKH, báo cáo và nhật ký thao tác.

Phiên bản **v1.0** chạy độc lập (Spring Boot), phục vụ demo và phát triển nội bộ. Chưa ghép JWT chung với `apps/api`.

> **Giao diện hiện tại chỉ là bản thử nghiệm.** HTML/CSS/JS trong `src/main/resources/static/` dùng để kiểm thử REST và luồng nghiệp vụ — không phải UI sản xuất.

---

## Cài đặt

### 1. Yêu cầu môi trường

| Thành phần | Phiên bản / ghi chú |
|---|---|
| Java | 21 |
| Maven | 3.9+ |
| PostgreSQL | 16 (local qua Docker hoặc Neon) |
| Docker Compose | tùy chọn, cho DB local |

### 2. Clone và vào thư mục dự án

```bash
cd <đường-dẫn-repo>/BIS
```

### 3. Chuẩn bị database

**Cách A — PostgreSQL local (khuyến nghị khi mới chạy):**

```bash
docker compose up -d postgres
```

Thông số mặc định từ `docker-compose.yml`:

| Mục | Giá trị |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `chototmua` |
| User / Password | `chototmua` / `chototmua` |

**Cách B — Neon / PostgreSQL remote:** tạo file `.env` ở gốc repo (không commit mật khẩu):

```env
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_SSLMODE=require
```

App tự nạp `.env` trước khi Spring khởi động (`DotEnvLoader`).

Biến môi trường hỗ trợ (mặc định = local Docker):

| Biến | Mặc định |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `chototmua` |
| `DB_USER` | `chototmua` |
| `DB_PASSWORD` | `chototmua` |
| `DB_SSLMODE` | `prefer` |

### 4. Migration & dữ liệu demo

Profile mặc định là `crm-db` (PostgreSQL + Flyway).

- Flyway chạy script từ `backend/src/main/resources/db/migration/`
  - `V1__init_schema.sql` — schema CRM + bán lẻ
  - `V2__operation_logs.sql` — nhật ký thao tác
- Khi bảng `users` **còn trống**, app tự gieo demo (`db/seed/crm-demo.sql`).
- DB đã có dữ liệu: không seed lại đầy đủ; vẫn bảo đảm tài khoản nhân viên demo có dòng `employees`.

### 5. Chạy ứng dụng

Từ gốc repo:

```bash
docker compose up -d postgres
mvn -pl modules/crm -am spring-boot:run
```

Hoặc chạy class `com.chototmua.crm.CrmApplication` từ IDE (DB / `.env` phải sẵn sàng).

**Port:**

| Dịch vụ | Port |
|---|---|
| Ứng dụng CRM | **8080** |
| PostgreSQL (Docker) | **5432** |

Nếu 8080 đã bị chiếm, đổi `server.port` trong `application.yml` hoặc dừng tiến trình đang dùng port đó.

**Chạy không cần DB** (profile fake — chủ yếu cho test / thử nhanh):

```bash
mvn -pl modules/crm -am spring-boot:run -Dspring-boot.run.profiles=crm-fake
```

### 6. Kiểm tra cài đặt thành công

1. Mở http://localhost:8080/api/crm/health — phải trả về OK (không cần đăng nhập).
2. Mở http://localhost:8080/home.html — thấy giao diện demo.

### 7. Chạy kiểm thử

```bash
mvn -q -pl modules/crm -am test
```

Test dùng profile `crm-fake` (không cần PostgreSQL).

---

## Sử dụng

### Đăng nhập (Basic Auth — bản thử)

Giao diện demo **không có form login riêng**. Trên mỗi trang, chọn vai trò / tài khoản ở panel bên trái (hoặc vùng actor). App gửi `Authorization: Basic` với mật khẩu **trùng tên đăng nhập**.

| Login | Vai trò | Gợi ý dùng |
|---|---|---|
| `admin` | Quản trị | Toàn quyền demo |
| `crm` | CRM Manager | Khách hàng, phân khúc, chiến dịch, khảo sát |
| `cs` | CSKH | Hội thoại, xem khách (sửa có thể 403) |
| `sales` | Kinh doanh | Thường bị 403 các API CRM |
| `an`, `binh`, `linh`, `dung` | Khách | Hộp thư khách, trả lời khảo sát |
| `chau`, `phong` | Khách khóa / đã xóa | Đối chiếu hộp thư trống |

Chỉ dùng cho demo — chưa phải JWT sản xuất. API `/api/**` (trừ health) yêu cầu Basic Auth.

### Các trang chính

| Trang | URL | Việc làm được |
|---|---|---|
| Trang chủ | http://localhost:8080/home.html | Tổng quan demo |
| Khách hàng | `/index.html` | Xem / thêm / sửa / khóa / xóa mềm khách |
| Hội thoại | `/conversations.html` | Hàng đợi ticket, live chat, escalate |
| Hồ sơ CRM | `/profiles.html` | Xem / tính lại RFM |
| Chiến dịch | `/campaigns.html` | Tạo / sửa chiến dịch in-app |
| Khảo sát | `/surveys.html` | Quản lý khảo sát & câu hỏi |
| Hộp thư khách | `/inbox.html` | Xem thư / thông báo phía khách |
| Phân khúc | `/segments.html` | Tạo / làm mới phân khúc |
| Báo cáo | `/reports.html` | Báo cáo khách / khảo sát |
| Nhật ký | `/logs.html` | Xem audit log |
| Cài đặt | `/settings.html` | Theme sáng / tối |

### Luồng dùng nhanh

1. Chạy app theo mục **Cài đặt**.
2. Mở http://localhost:8080/home.html.
3. Chọn tài khoản nhân viên (ví dụ `crm` hoặc `admin`) trên trang cần thao tác.
4. Thử lần lượt:
   - **Khách hàng** — xem danh sách, mở chi tiết, thêm khách mới.
   - **Hội thoại** — chọn `cs` hoặc `crm`, mở ticket demo, gửi tin nhắn.
   - **Chiến dịch / Khảo sát / Phân khúc** — tạo hoặc chỉnh bản ghi demo.
   - **Hộp thư khách** — chuyển sang login `an` / `binh` để xem phía khách.
5. Đổi vai trò bất kỳ lúc nào để kiểm tra quyền (403 là hành vi kỳ vọng với `sales` / một số thao tác của `cs`).

### Gọi API thủ công (tùy chọn)

```bash
curl -u crm:crm http://localhost:8080/api/customers
curl -u admin:admin http://localhost:8080/api/campaigns
curl http://localhost:8080/api/crm/health
```

### Chức năng ↔ API

| Khu vực | API |
|---|---|
| Khách hàng | `/api/customers` |
| Hồ sơ CRM / RFM | `/api/crm/profiles` |
| Phân khúc | `/api/segments` |
| Chiến dịch | `/api/campaigns` |
| Khảo sát | `/api/surveys` |
| Hội thoại | `/api/conversations` |
| Báo cáo | `/api/crm/reports` |
| Nhật ký | `/api/crm/audit-logs` |
| Thông báo | `/api/notifications` |

---

## Lưu ý quan trọng

- **Port:** app `8080`, Postgres Docker `5432`.
- **Data:** seed tự động chỉ khi `users` trống; sửa trên DB được giữ khi khởi động lại.
- **Database:** mặc định `crm-db` + Flyway; test dùng `crm-fake` (in-memory).
- **UI:** bản thử nghiệm — branding/layout/auth chính thức sẽ thay đổi sau.
- **Bảo mật:** Basic Auth + tài khoản demo in-memory; khi ghép `apps/api` dự kiến dùng JWT nhóm.

---

## Cấu trúc nhanh

```
modules/crm/
├── pom.xml
├── README.md
└── src/
    ├── main/
    │   ├── java/com/chototmua/crm/
    │   │   ├── CrmApplication.java
    │   │   ├── adapter/          # JDBC / fake ports
    │   │   ├── application/      # service nghiệp vụ
    │   │   ├── config/           # security, dotenv, demo actors
    │   │   ├── domain/
    │   │   ├── port/
    │   │   └── web/              # REST controllers
    │   └── resources/
    │       ├── application.yml           # port 8080, profile crm-db
    │       ├── application-crm-db.yml
    │       ├── application-crm-fake.yml
    │       ├── db/seed/crm-demo.sql
    │       └── static/                   # UI thử nghiệm
    └── test/
```

Schema SQL dùng chung: `backend/src/main/resources/db/migration/`.
