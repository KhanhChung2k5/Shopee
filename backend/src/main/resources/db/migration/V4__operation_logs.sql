-- Nhật ký thao tác cho quản trị viên (phân hệ CRM). Không khóa ngoại actor_id
-- để vẫn ghi được khi người thực hiện không còn trong bảng users.
-- IF NOT EXISTS: bảng đã được module CRM tạo sẵn trên DB dùng chung trước khi gộp vào backend.

CREATE TABLE IF NOT EXISTS operation_logs (
    id            UUID PRIMARY KEY,
    actor_id      UUID,
    actor_login   VARCHAR(100) NOT NULL,
    actor_label   VARCHAR(255) NOT NULL,
    department    VARCHAR(20),
    action        VARCHAR(255) NOT NULL,
    http_method   VARCHAR(10) NOT NULL,
    path          VARCHAR(500) NOT NULL,
    status_code   INTEGER NOT NULL,
    outcome       VARCHAR(20) NOT NULL, -- success | failed
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_occurred_at ON operation_logs (occurred_at DESC);
