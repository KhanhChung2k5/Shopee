-- Kiểm soát nội bộ cho phiếu nhập: ghi ai duyệt / từ chối và lúc nào; người lập phiếu không được tự duyệt.
-- Phiếu cũ đã duyệt trước V9 để NULL (không biết người duyệt).
ALTER TABLE goods_receipts
    ADD COLUMN decided_by UUID REFERENCES employees(id),
    ADD COLUMN decided_at TIMESTAMPTZ;

-- Hàng khách trả lại: CS ghi nhận đã nhận hàng hoàn; nếu còn bán được thì nhập lại kho
-- (inventory_movements.type = 'return', trỏ về yêu cầu hoàn qua refund_return_id).
ALTER TABLE refund_returns
    ADD COLUMN received_at          TIMESTAMPTZ,
    ADD COLUMN restock_warehouse_id UUID REFERENCES warehouses(id); -- NULL = hàng lỗi, không nhập lại kho

ALTER TABLE inventory_movements
    ADD COLUMN refund_return_id UUID REFERENCES refund_returns(id);
CREATE INDEX idx_inventory_movements_refund_return_id ON inventory_movements(refund_return_id);
