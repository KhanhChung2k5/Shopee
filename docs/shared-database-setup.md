# Database dùng chung (Neon PostgreSQL)

> Cả nhóm dùng chung **1 database duy nhất** trên Neon (thay vì mỗi người 1 Postgres
> local qua `docker-compose`) — ai sửa/thêm dữ liệu, người khác thấy ngay khi query lại.
> Migration (39 bảng) đã được chạy sẵn — thành viên khác **không cần chạy lại**.
>
> **2026-10-02: đã đổi sang project Neon mới ở region Singapore (`ap-southeast-1`)** để
> giảm độ trễ cho cả nhóm (trước đây ở `us-east-2`, Mỹ). Project cũ không còn được dùng.
> **Mọi thành viên cần cập nhật lại `DB_HOST` trong file `backend/.env` của mình** theo
> giá trị mới bên dưới — nếu không sẽ không kết nối được.

## Cách kết nối (áp dụng cho tất cả thành viên)

Không cần sửa code, không cần set biến môi trường thủ công — `application.yml` đã cấu
hình sẵn tự đọc file `backend/.env` (Spring Boot's `spring.config.import`, tương tự cách
Node.js đọc `.env`).

**Chỉ cần 1 bước:** tạo file `backend/.env` (đã có sẵn trong `.gitignore`, **không bị
commit lên git**) với nội dung:
```
DB_HOST=ep-patient-term-b3xj1n06-pooler.c-4.ap-southeast-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=<hỏi trưởng nhóm lấy password thật, không commit vào git>
DB_SSLMODE=require
```

Rồi chạy như bình thường — không cần gì thêm:
```bash
./mvnw spring-boot:run        # macOS/Linux
./mvnw.cmd spring-boot:run     # Windows
```

Spring Boot tự nạp `.env` mỗi lần chạy, miễn file nằm đúng trong thư mục `backend/`
(nơi lệnh `mvnw` được gọi).

## Không cần Docker Postgres local nữa

Bỏ qua bước `docker-compose up -d` cho service `postgres` — nếu vẫn muốn chạy Postgres
local để test offline (không có mạng), chỉ cần **không set** các biến `DB_*` ở trên,
backend sẽ tự quay về mặc định local (`127.0.0.1:5434`, không SSL) như cũ.

## Lấy password thật ở đâu

Password **không được ghi trong file này** (tránh lộ qua git) — hỏi trực tiếp người tạo
project Neon (qua kênh chat riêng của nhóm), hoặc tự lấy trong Neon Dashboard:
`console.neon.tech` → chọn project → nút **"⚡ Connect"** → copy connection string.

## Lưu ý khi cả nhóm cùng dùng chung 1 database

- **Dữ liệu là chung** — nếu 1 người xoá/sửa dữ liệu test, người khác cũng thấy thay đổi
  đó ngay. Nên thống nhất quy ước đặt tên dữ liệu test (VD: thêm hậu tố tên mình) để
  tránh giẫm lên nhau.
- **Không cần ai chạy Flyway migration nữa** — bảng đã tồn tại sẵn trên Neon. Nếu sau này
  có thêm file migration mới (`V2__...sql`), chỉ cần **1 người** chạy backend 1 lần là đủ
  cho cả nhóm.
- Neon free tier có giới hạn compute time/tháng — nếu thấy backend "khởi động chậm" ở lần
  kết nối đầu sau khi không ai dùng 1 lúc lâu, đó là Neon đang "đánh thức" compute
  (bình thường, không phải lỗi).
