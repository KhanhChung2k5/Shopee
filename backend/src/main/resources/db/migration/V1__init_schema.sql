-- =====================================================================
-- V1__init_schema.sql
-- Khởi tạo toàn bộ 41 bảng cho hệ thống CRM + Bán lẻ trực tuyến
-- (Chợ Tốt Mua — chuyên tay cầm chơi game & đĩa game) — dịch trực tiếp từ
-- crm-ecommerce-class-diagram.md (v17).
-- Bảng theo đúng thứ tự phụ thuộc khoá ngoại (dependency order) để chạy
-- được ngay từ CSDL rỗng bằng Flyway.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- cho gen_random_uuid()

-- =====================================================================
-- DOMAIN A — Identity & Company
-- =====================================================================

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id             UUID NOT NULL REFERENCES roles(id),
    phone               VARCHAR(20) UNIQUE,
    email               VARCHAR(255) UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'active', -- active | locked | deleted
    full_name           VARCHAR(255),
    avatar_url          VARCHAR(500),
    gender              VARCHAR(20),
    dob                 DATE,
    wallet_balance      DECIMAL(12,2) NOT NULL DEFAULT 0, -- gộp từ bảng wallets (v13, quan hệ 1-1 bắt buộc)
    loyalty_balance     INTEGER NOT NULL DEFAULT 0, -- gộp từ bảng loyalty_points (v13)
    loyalty_tier        VARCHAR(50), -- gộp từ bảng loyalty_points (v13)
    ltv                 DECIMAL(12,2) NOT NULL DEFAULT 0, -- gộp từ bảng customer_profiles_crm (v13)
    total_orders        INTEGER NOT NULL DEFAULT 0, -- gộp từ bảng customer_profiles_crm (v13)
    last_purchase_at    DATE, -- gộp từ bảng customer_profiles_crm (v13)
    rfm_segment         VARCHAR(50), -- gộp từ bảng customer_profiles_crm (v13)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at       TIMESTAMPTZ
);
CREATE INDEX idx_users_role_id ON users(role_id);

CREATE TABLE addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name  VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    full_address    VARCHAR(500) NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

CREATE TABLE employees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department  VARCHAR(20) NOT NULL, -- sales | warehouse | admin | cs
    position    VARCHAR(100),
    hired_at    TIMESTAMPTZ
);

-- =====================================================================
-- DOMAIN B — Catalog & Inventory
-- =====================================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID REFERENCES categories(id),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE
);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID REFERENCES categories(id),
    brand_name          VARCHAR(255), -- gộp từ bảng brands (v16), không tách bảng danh mục thương hiệu riêng
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | published
    product_type        VARCHAR(20) NOT NULL DEFAULT 'accessory', -- game_disc | controller | accessory
    platforms           JSONB, -- mảng nền tảng tương thích, vd ["PS5","PS4"]
    publisher           VARCHAR(255), -- chỉ dùng khi product_type = 'game_disc'
    genre               VARCHAR(100), -- chỉ dùng khi product_type = 'game_disc'
    age_rating          VARCHAR(10), -- PEGI/ESRB, chỉ dùng khi product_type = 'game_disc'
    release_date        DATE,
    connection_type     VARCHAR(20), -- wired | wireless | bluetooth, chỉ dùng cho controller/accessory
    warranty_months     INTEGER, -- chỉ dùng cho hàng phần cứng (controller/accessory)
    image_urls          JSONB -- gộp từ bảng product_images (v13); mảng URL, thứ tự trong mảng = thứ tự hiển thị
);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_product_type ON products(product_type);

CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL UNIQUE,
    attributes      JSONB,
    price           DECIMAL(12,2) NOT NULL,
    compare_price   DECIMAL(12,2),
    image_url       VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

CREATE TABLE warehouses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    address     VARCHAR(500)
);

CREATE TABLE inventory_stocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    quantity        INTEGER NOT NULL DEFAULT 0,
    reserved_qty    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (variant_id, warehouse_id)
);
CREATE INDEX idx_inventory_stocks_variant_id ON inventory_stocks(variant_id);
CREATE INDEX idx_inventory_stocks_warehouse_id ON inventory_stocks(warehouse_id);

CREATE TABLE goods_receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    supplier_name   VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected; chỉ cộng InventoryStock khi approved
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goods_receipts_employee_id ON goods_receipts(employee_id);
CREATE INDEX idx_goods_receipts_warehouse_id ON goods_receipts(warehouse_id);

CREATE TABLE goods_receipt_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id  UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    variant_id  UUID NOT NULL REFERENCES product_variants(id),
    quantity    INTEGER NOT NULL,
    unit_cost   DECIMAL(12,2) NOT NULL,
    line_total  DECIMAL(12,2) NOT NULL -- quantity * unit_cost
);
CREATE INDEX idx_goods_receipt_items_receipt_id ON goods_receipt_items(receipt_id);

-- =====================================================================
-- DOMAIN C — Cart -> Order -> Payment -> Shipping
-- =====================================================================

CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id  UUID NOT NULL REFERENCES product_variants(id),
    quantity    INTEGER NOT NULL DEFAULT 1,
    is_selected BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

CREATE TABLE orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id),
    employee_id             UUID REFERENCES employees(id), -- NULL nếu khách tự đặt online, gán khi nhân viên xử lý/xuất hoá đơn
    address_id              UUID NOT NULL REFERENCES addresses(id),
    shipping_address_snapshot  VARCHAR(500) NOT NULL, -- snapshot fullAddress lúc đặt hàng — tránh lịch sử đơn bị đổi hồi tố nếu addresses.fullAddress bị sửa sau này
    subtotal_amount         DECIMAL(12,2) NOT NULL,
    discount_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_fee_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount            DECIMAL(12,2) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|confirmed|shipping|delivered|cancelled
    warehouse_id            UUID REFERENCES warehouses(id), -- gộp từ bảng shipments (v13); kho xuất hàng, NULL cho tới khi xác nhận đóng gói
    shipping_provider_name  VARCHAR(255), -- gộp từ bảng shipments (v13) rồi bảng shipping_providers (v16) — không tách danh mục đơn vị vận chuyển riêng
    tracking_no             VARCHAR(100), -- gộp từ bảng shipments (v13)
    shipment_status         VARCHAR(20) NOT NULL DEFAULT 'pending', -- gộp từ bảng shipments (v13); pending|packed|shipping|delivered
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_employee_id ON orders(employee_id);
CREATE INDEX idx_orders_warehouse_id ON orders(warehouse_id);

CREATE TABLE order_items (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id                      UUID NOT NULL REFERENCES product_variants(id),
    quantity                        INTEGER NOT NULL,
    unit_price                      DECIMAL(12,2) NOT NULL,
    line_total                      DECIMAL(12,2) NOT NULL, -- quantity * unit_price, lưu sẵn cho chi tiết hoá đơn
    product_name_snapshot           VARCHAR(255),
    variant_attributes_snapshot     JSONB
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

CREATE TABLE order_status_histories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL,
    changed_by      UUID REFERENCES users(id),
    changed_by_type VARCHAR(20), -- buyer | employee | system
    reason          VARCHAR(500),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_status_histories_order_id ON order_status_histories(order_id);

CREATE TABLE inventory_movements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id            UUID NOT NULL REFERENCES inventory_stocks(id),
    order_id            UUID REFERENCES orders(id), -- có giá trị khi type=export (bán hàng)
    goods_receipt_id    UUID REFERENCES goods_receipts(id), -- có giá trị khi type=import (nhập kho)
    type                VARCHAR(20) NOT NULL, -- import | export | adjust
    quantity            INTEGER NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_movements_stock_id ON inventory_movements(stock_id);
CREATE INDEX idx_inventory_movements_order_id ON inventory_movements(order_id);
CREATE INDEX idx_inventory_movements_goods_receipt_id ON inventory_movements(goods_receipt_id);

-- wallets (v10-v12) đã gộp thành users.wallet_balance ở v13 (quan hệ 1-1 bắt buộc)

CREATE TABLE wallet_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- trước v13 trỏ qua wallets.id
    order_id    UUID REFERENCES orders(id), -- NULL nếu là nạp ví; có giá trị khi type=payment (trả đơn bằng ví) hoặc refund (hoàn tiền cho 1 đơn cụ thể)
    type        VARCHAR(20) NOT NULL, -- topup | refund | payment
    amount      DECIMAL(12,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_order_id ON wallet_transactions(order_id);

CREATE TABLE payments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID REFERENCES orders(id),          -- NULL nếu là nạp ví
    user_id                 UUID REFERENCES users(id),           -- NULL nếu là thanh toán đơn; trước v13 trỏ qua wallets.id
    wallet_transaction_id   UUID REFERENCES wallet_transactions(id), -- WalletTransaction được tạo khi nạp ví thành công
    purpose                 VARCHAR(20) NOT NULL, -- checkout | wallet_topup
    method                  VARCHAR(20), -- cod | bank_transfer | wallet
    amount                  DECIMAL(12,2) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
    paid_at                 TIMESTAMPTZ,
    CHECK (
        (purpose = 'checkout' AND order_id IS NOT NULL) OR
        (purpose = 'wallet_topup' AND user_id IS NOT NULL)
    )
);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- shipments/shipment_items (v10-v12) đã gộp thẳng vào orders ở v13 — 1 đơn luôn
-- giao trong đúng 1 chuyến (không hỗ trợ giao 1 phần), nên bảng riêng là thừa.
-- shipping_providers (v1-v15) đã gộp thành orders.shipping_provider_name ở v16.

CREATE TABLE refund_returns (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id           UUID NOT NULL REFERENCES order_items(id),
    employee_id             UUID REFERENCES employees(id), -- nhân viên CSKH duyệt/từ chối; NULL cho tới khi được xử lý
    wallet_transaction_id   UUID REFERENCES wallet_transactions(id),
    reason                  VARCHAR(500),
    status                  VARCHAR(20) NOT NULL DEFAULT 'requested', -- requested|approved|rejected|refunded
    refund_amount           DECIMAL(12,2),
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refund_returns_order_item_id ON refund_returns(order_item_id);
CREATE INDEX idx_refund_returns_employee_id ON refund_returns(employee_id);

-- =====================================================================
-- DOMAIN D — Marketing & Loyalty
-- =====================================================================

CREATE TABLE promotion_programs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    program_type        VARCHAR(20) NOT NULL, -- nhãn phân loại chương trình cho báo cáo/lọc (vd: seasonal, clearance, member_only) — độc lập với type/discount của từng cơ chế con (PromotionProductDetail/PromotionInvoiceDetail/Voucher)
    target_loyalty_tier VARCHAR(50), -- NULL = áp dụng mọi hạng; khớp giá trị với users.loyalty_tier
    start_at            TIMESTAMPTZ NOT NULL,
    end_at              TIMESTAMPTZ NOT NULL
);

CREATE TABLE promotion_product_details (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_program_id    UUID NOT NULL REFERENCES promotion_programs(id) ON DELETE CASCADE,
    variant_id              UUID NOT NULL REFERENCES product_variants(id), -- v16: đổi từ product_id sang variant_id để gộp được cơ chế FlashSale (giá sốc theo từng SKU)
    discount_percent        DECIMAL(5,2), -- cơ chế 1: giảm % — nghiệp vụ chọn 1 trong 2 cơ chế, field còn lại để NULL
    flash_price             DECIMAL(12,2), -- cơ chế 2 (gộp từ FlashSaleItem, v16): giá sốc cố định, thường kèm giới hạn số lượng
    limit_qty               INTEGER, -- chỉ dùng khi flash_price được set — giới hạn số lượng bán ở giá sốc
    sold_qty                INTEGER NOT NULL DEFAULT 0 -- chỉ dùng khi flash_price được set — số lượng đã bán ở giá sốc
);
CREATE INDEX idx_promotion_product_details_program_id ON promotion_product_details(promotion_program_id);
CREATE INDEX idx_promotion_product_details_variant_id ON promotion_product_details(variant_id);

CREATE TABLE promotion_invoice_details (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_program_id    UUID NOT NULL REFERENCES promotion_programs(id) ON DELETE CASCADE,
    discount_amount         DECIMAL(12,2), -- số tiền giảm cố định trên tổng hoá đơn
    discount_percent        DECIMAL(5,2)   -- % giảm trên tổng hoá đơn; nghiệp vụ chọn 1 trong 2, field còn lại NULL
);
CREATE INDEX idx_promotion_invoice_details_program_id ON promotion_invoice_details(promotion_program_id);

CREATE TABLE vouchers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_program_id    UUID NOT NULL REFERENCES promotion_programs(id) ON DELETE CASCADE,
    code                    VARCHAR(50) NOT NULL UNIQUE,
    type                    VARCHAR(20) NOT NULL, -- percentage | fixed_amount
    value                   DECIMAL(12,2) NOT NULL,
    expires_at              TIMESTAMPTZ
);
CREATE INDEX idx_vouchers_promotion_program_id ON vouchers(promotion_program_id);

CREATE TABLE voucher_usages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id  UUID NOT NULL REFERENCES vouchers(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    order_id    UUID NOT NULL REFERENCES orders(id),
    used_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_voucher_usages_voucher_id ON voucher_usages(voucher_id);

CREATE TABLE promotion_product_applications (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id                   UUID NOT NULL REFERENCES order_items(id),
    promotion_product_detail_id     UUID NOT NULL REFERENCES promotion_product_details(id),
    discount_amount                 DECIMAL(12,2) NOT NULL, -- số tiền thực giảm cho dòng order_item này
    applied_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_promotion_product_applications_order_item_id ON promotion_product_applications(order_item_id);
CREATE INDEX idx_promotion_product_applications_detail_id ON promotion_product_applications(promotion_product_detail_id);

CREATE TABLE promotion_invoice_applications (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                        UUID NOT NULL REFERENCES orders(id),
    promotion_invoice_detail_id     UUID NOT NULL REFERENCES promotion_invoice_details(id),
    discount_amount                 DECIMAL(12,2) NOT NULL, -- số tiền thực giảm cho cả hoá đơn này
    applied_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_promotion_invoice_applications_order_id ON promotion_invoice_applications(order_id);
CREATE INDEX idx_promotion_invoice_applications_detail_id ON promotion_invoice_applications(promotion_invoice_detail_id);

-- flash_sales/flash_sale_items (v1-v15) đã gộp thành promotion_product_details.flashPrice/limitQty/soldQty
-- ở v16 — PromotionProgram (startAt/endAt có sẵn) đóng luôn vai trò khung thời gian của FlashSale cũ.

-- loyalty_points (v1-v12) đã gộp thành users.loyalty_balance/loyalty_tier ở v13 (quan hệ 1-1 bắt buộc)

CREATE TABLE loyalty_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    order_id    UUID REFERENCES orders(id),
    points      INTEGER NOT NULL,
    reason      VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);

CREATE TABLE reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    order_item_id       UUID NOT NULL UNIQUE REFERENCES order_items(id),
    rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    employee_reply_id   UUID REFERENCES employees(id), -- gộp từ bảng review_replies (v13); NULL = chưa được phản hồi
    reply_text          TEXT, -- gộp từ bảng review_replies (v13)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- DOMAIN E — CRM & Customer Care
-- =====================================================================

-- customer_profiles_crm (v1-v12) đã gộp thành users.ltv/totalOrders/lastPurchaseAt/rfmSegment ở v13 (quan hệ 1-1 bắt buộc)

CREATE TABLE customer_segments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    rule_definition JSONB
);

CREATE TABLE segment_members (
    segment_id  UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (segment_id, user_id)
);

CREATE TABLE campaigns (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    channel     VARCHAR(20), -- email | push | sms
    start_at    TIMESTAMPTZ,
    end_at      TIMESTAMPTZ
);

CREATE TABLE campaign_targets (
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    segment_id  UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, segment_id)
);

CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    order_id        UUID REFERENCES orders(id),
    type            VARCHAR(20) NOT NULL DEFAULT 'chat', -- ticket | chat
    channel         VARCHAR(50),
    status          VARCHAR(20), -- open | in_progress | closed (chỉ dùng khi type = 'ticket')
    priority        VARCHAR(20), -- chỉ dùng khi type = 'ticket'
    last_message_at TIMESTAMPTZ
);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

CREATE TABLE conversation_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);

CREATE TABLE agent_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    is_current      BOOLEAN NOT NULL DEFAULT true,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_assignments_conversation_id ON agent_assignments(conversation_id);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    reference_type  VARCHAR(50), -- order | ticket | campaign | survey | conversation
    reference_id    UUID,        -- đa hình theo reference_type, không đặt FK cứng
    channel         VARCHAR(20),
    content         VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent | read
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- surveys/survey_questions/survey_responses/survey_answers: bỏ ở v15, khôi phục lại ở v17
-- theo yêu cầu — tính năng khảo sát gắn với logic nghiệp vụ CRM của môn Hệ thống
-- thông tin doanh nghiệp, không phải chỉ phục vụ riêng đồ án CNPM.

CREATE TABLE surveys (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_employee_id  UUID NOT NULL REFERENCES employees(id),
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | sent | closed
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE survey_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    answer_type     VARCHAR(20) NOT NULL DEFAULT 'text', -- text | rating | multiple_choice
    sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id);

CREATE TABLE survey_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    order_id        UUID REFERENCES orders(id), -- khảo sát NPS gắn với 1 đơn hàng cụ thể
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (survey_id, user_id)
);
CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);

CREATE TABLE survey_answers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id),
    answer_text TEXT
);
CREATE INDEX idx_survey_answers_response_id ON survey_answers(response_id);
