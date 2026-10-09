# Chiến lược sao lưu & phục hồi CSDL

> Tài liệu độc lập — nội dung này sẽ được gộp vào báo cáo HTTTDN Phần II
> (Cài đặt CSDL + backup, 10đ) khi chốt lại cấu trúc báo cáo đầy đủ.

## 1. Hai lớp bảo vệ dữ liệu

| Lớp | Công cụ | Bảo vệ khỏi | Vị trí |
|---|---|---|---|
| **Schema (cấu trúc bảng)** | Flyway migration (`V1__init_schema.sql`, các `V2__...` sau này) | Mất/sai cấu trúc CSDL — tái tạo lại từ đầu bất kỳ lúc nào bằng `docker compose up` | `backend/src/main/resources/db/migration/` |
| **Dữ liệu thực tế** | `pg_dump` logical backup | Mất dữ liệu do lỗi thao tác, hỏng ổ đĩa, xoá nhầm | `backups/` (không commit vào git — xem `.gitignore`) |

Hai lớp này bổ sung cho nhau: Flyway đảm bảo *cấu trúc* luôn tái tạo được, `pg_dump` đảm bảo *dữ liệu* (đơn hàng, khách hàng, khảo sát...) không mất khi có sự cố.

## 2. Công cụ & định dạng

- **`pg_dump -F c`** (custom format): nén sẵn, hỗ trợ restore chọn lọc từng bảng nếu cần, nhanh hơn dump SQL thuần cho CSDL cỡ vừa.
- Backup được thực hiện **bên trong container Postgres** (qua `docker exec`) rồi copy ra ngoài — không yêu cầu cài `pg_dump` trên máy host.

## 3. Lịch backup & retention

- **Tần suất**: chạy `scripts/backup-db.sh` mỗi ngày (cron trên Linux/macOS, Task Scheduler trên Windows).
- **Retention**: giữ lại **7 bản gần nhất**, tự động xoá bản cũ hơn (rolling window đơn giản, đủ cho môi trường dev/demo đồ án — production thật sẽ cần thêm backup off-site/weekly-monthly theo chính sách GFS).
- File đặt tên theo timestamp: `chotomua_YYYY-MM-DD_HHMMSS.dump`.

## 4. Quy trình backup

```bash
./scripts/backup-db.sh
```

Kết quả: `backups/chotomua_2026-09-18_140500.dump`.

## 5. Quy trình phục hồi (restore)

```bash
./scripts/restore-db.sh backups/chotomua_2026-09-18_140500.dump
```

Script sẽ:
1. Copy file dump vào container.
2. Phục hồi vào **CSDL tạm** `chotomua_restoring` (không ghi đè trực tiếp CSDL đang chạy).
3. In ra lệnh để người vận hành **tự xác nhận** rồi mới đổi tên CSDL — tránh phục hồi nhầm đè lên dữ liệu mới hơn khi chưa kiểm tra.

## 6. Kiểm thử khả năng phục hồi

Trước khi bàn giao/nộp đồ án, nên chạy thử 1 lần đầy đủ:
1. `./scripts/backup-db.sh` — tạo 1 bản backup từ dữ liệu hiện tại.
2. Xoá thử 1 dòng dữ liệu bất kỳ (vd 1 `User`) để mô phỏng sự cố.
3. `./scripts/restore-db.sh <file vừa tạo>` — phục hồi vào `chotomua_restoring`.
4. Query `chotomua_restoring` xác nhận dòng dữ liệu đã xoá vẫn còn trong bản backup → chứng minh quy trình backup/restore hoạt động đúng.

## 7. Giới hạn đã biết (ghi rõ để không hiểu nhầm là production-grade)

- Chưa có backup **off-site** (backup vẫn nằm cùng máy chủ) — rủi ro nếu hỏng toàn bộ máy chủ.
- Chưa có **Point-in-Time Recovery** (PITR) qua WAL archiving — chỉ khôi phục được đến đúng thời điểm chạy `pg_dump` gần nhất, có thể mất dữ liệu phát sinh sau đó tối đa 24h (theo tần suất backup).
- Phù hợp cho quy mô đồ án/demo; nếu triển khai thật cần bổ sung PITR + backup off-site (S3/Backblaze...).
