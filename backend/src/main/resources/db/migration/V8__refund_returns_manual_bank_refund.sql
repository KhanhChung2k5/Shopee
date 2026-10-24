-- Hoàn tiền được đưa trở lại (V6 đã xoá bản cũ). Không còn ví nên tiền được CHUYỂN KHOẢN TRẢ THỦ CÔNG
-- vào tài khoản ngân hàng khách cung cấp; hệ thống chỉ ghi nhận yêu cầu, người duyệt và mã giao dịch.
--   kind = 'return'       : khách trả một dòng hàng sau khi đơn đã giao (CS duyệt / từ chối)
--   kind = 'cancellation' : đơn chuyển khoản shop ĐÃ NHẬN TIỀN rồi bị huỷ — tạo sẵn ở trạng thái approved
-- status: requested → approved → refunded, hoặc requested → rejected
CREATE TABLE refund_returns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id),
    order_item_id       UUID REFERENCES order_items(id),          -- NULL = hoàn cả đơn (kind = cancellation)
    kind                VARCHAR(20) NOT NULL CHECK (kind IN ('return', 'cancellation')),
    reason              VARCHAR(500),
    status              VARCHAR(20) NOT NULL DEFAULT 'requested'
                        CHECK (status IN ('requested', 'approved', 'rejected', 'refunded')),
    refund_amount       DECIMAL(12,2),
    bank_name           VARCHAR(100),
    bank_account_no     VARCHAR(50),
    bank_account_name   VARCHAR(255),
    employee_id         UUID REFERENCES employees(id),             -- nhân viên CS/admin xử lý gần nhất
    staff_note          VARCHAR(500),                              -- lý do từ chối / ghi chú nội bộ
    transfer_ref        VARCHAR(100),                              -- mã giao dịch chuyển khoản trả khách
    requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    handled_at          TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,
    CHECK ((kind = 'return') = (order_item_id IS NOT NULL))
);
CREATE INDEX idx_refund_returns_order_id ON refund_returns(order_id);
CREATE INDEX idx_refund_returns_status ON refund_returns(status);
-- Mỗi dòng hàng chỉ có một yêu cầu đang mở / đã hoàn (yêu cầu bị từ chối thì được gửi lại).
CREATE UNIQUE INDEX uq_refund_returns_active_item ON refund_returns(order_item_id) WHERE status <> 'rejected';
-- Mỗi đơn huỷ chỉ hoàn một lần.
CREATE UNIQUE INDEX uq_refund_returns_cancellation ON refund_returns(order_id) WHERE kind = 'cancellation';
