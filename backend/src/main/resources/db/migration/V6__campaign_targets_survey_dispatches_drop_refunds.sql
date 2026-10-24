-- 1) Sản phẩm mục tiêu của chiến dịch — trước đây chỉ nằm trong bộ nhớ, mất mỗi lần khởi động lại.
CREATE TABLE IF NOT EXISTS campaign_product_targets (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    filter      JSONB,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Khảo sát nào đã gửi cho đơn nào — chống gửi trùng khảo sát NPS cho cùng một đơn,
--    kể cả sau khi backend khởi động lại (trước đây là một Set trong bộ nhớ).
CREATE TABLE IF NOT EXISTS survey_order_dispatches (
    survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (survey_id, order_id)
);

-- 3) Chức năng hoàn tiền đã bị loại khỏi hệ thống.
DROP TABLE IF EXISTS refund_returns;
