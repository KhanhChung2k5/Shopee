-- Sản phẩm mục tiêu của khảo sát (khảo sát NPS tự gửi khi đơn chứa sản phẩm này được giao).
-- Trước đây chỉ nằm trong bộ nhớ nên mất mỗi lần backend khởi động lại.
CREATE TABLE IF NOT EXISTS survey_product_targets (
    survey_id   UUID PRIMARY KEY REFERENCES surveys(id) ON DELETE CASCADE,
    product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    filter      JSONB,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
