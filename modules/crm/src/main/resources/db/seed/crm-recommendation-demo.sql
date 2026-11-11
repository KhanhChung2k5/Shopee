-- Bổ sung catalog + đơn để 5 quy tắc gợi ý đều có khách trên DB demo.
-- Không tạo bảng mới. Trùng id thì giữ số liệu, nhưng ghi lại cột chữ
-- để sửa dữ liệu đã bị mất dấu tiếng Việt (Đ, ể, … thành ?).

UPDATE products
SET genre = 'Thể thao'
WHERE id = '02020202-0000-0000-0000-000000000002'
  AND genre IS DISTINCT FROM 'Thể thao';

INSERT INTO products (
    id, category_id, brand_name, name, description, status, product_type,
    platforms, publisher, genre, age_rating, connection_type, warranty_months
) VALUES
    ('02020202-0000-4000-8000-000000000019', '01010101-0000-0000-0000-000000000002', '2K', 'Đĩa NBA 2K25', 'Đĩa NBA 2K25 chính hãng, bán tại Chợ Tốt Mua.', 'published', 'game_disc', '["PS5"]'::jsonb, '2K', 'Thể thao', '3', NULL, NULL),
    ('02020202-0000-4000-8000-000000000020', '01010101-0000-0000-0000-000000000002', 'Sony', 'Đĩa Marvel Spider-Man 2', 'Đĩa Marvel Spider-Man 2 chính hãng, bán tại Chợ Tốt Mua.', 'published', 'game_disc', '["PS5"]'::jsonb, 'Insomniac', 'Hành động', '16', NULL, NULL),
    ('02020202-0000-4000-8000-000000000021', '01010101-0000-0000-0000-000000000002', 'Nintendo', 'Đĩa Super Mario Odyssey', 'Đĩa Super Mario Odyssey chính hãng, bán tại Chợ Tốt Mua.', 'published', 'game_disc', '["Switch"]'::jsonb, 'Nintendo', 'Phiêu lưu', '7', NULL, NULL),
    ('02020202-0000-4000-8000-000000000022', '01010101-0000-0000-0000-000000000002', 'Bandai Namco', 'Đĩa Dark Souls III', 'Đĩa Dark Souls III chính hãng, bán tại Chợ Tốt Mua.', 'published', 'game_disc', '["PS5"]'::jsonb, 'FromSoftware', 'Nhập vai', '16', NULL, NULL),
    ('02020202-0000-4000-8000-000000000023', '01010101-0000-0000-0000-000000000002', 'Re-Logic', 'Đĩa Terraria', 'Đĩa Terraria chính hãng, bán tại Chợ Tốt Mua.', 'published', 'game_disc', '["Switch","PS5"]'::jsonb, 'Re-Logic', 'Sandbox', '7', NULL, NULL),
    ('02020202-0000-4000-8000-000000000024', '01010101-0000-0000-0000-000000000002', 'Nintendo', 'Đĩa Animal Crossing', 'Đĩa Animal Crossing chính hãng, bán tại Chợ Tốt Mua.', 'published', 'game_disc', '["Switch"]'::jsonb, 'Nintendo', 'Mô phỏng', '3', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    genre = EXCLUDED.genre,
    brand_name = EXCLUDED.brand_name,
    publisher = EXCLUDED.publisher;

INSERT INTO product_variants (id, product_id, sku, price, status) VALUES
    ('03030303-0000-0000-0000-000000000019', '02020202-0000-4000-8000-000000000019', 'SKU-019', 890000.00, 'active'),
    ('03030303-0000-0000-0000-000000000020', '02020202-0000-4000-8000-000000000020', 'SKU-020', 1290000.00, 'active'),
    ('03030303-0000-0000-0000-000000000021', '02020202-0000-4000-8000-000000000021', 'SKU-021', 1190000.00, 'active'),
    ('03030303-0000-0000-0000-000000000022', '02020202-0000-4000-8000-000000000022', 'SKU-022', 990000.00, 'active'),
    ('03030303-0000-0000-0000-000000000023', '02020202-0000-4000-8000-000000000023', 'SKU-023', 450000.00, 'active'),
    ('03030303-0000-0000-0000-000000000024', '02020202-0000-4000-8000-000000000024', 'SKU-024', 990000.00, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_stocks (id, variant_id, warehouse_id, quantity, reserved_qty) VALUES
    ('51000001-0000-4000-8000-000000000019', '03030303-0000-0000-0000-000000000019', '11000001-0000-4000-8000-000000000001', 40, 0),
    ('51000001-0000-4000-8000-000000000020', '03030303-0000-0000-0000-000000000020', '11000001-0000-4000-8000-000000000001', 35, 0),
    ('51000001-0000-4000-8000-000000000021', '03030303-0000-0000-0000-000000000021', '11000001-0000-4000-8000-000000000001', 30, 0),
    ('51000001-0000-4000-8000-000000000022', '03030303-0000-0000-0000-000000000022', '11000001-0000-4000-8000-000000000001', 28, 0),
    ('51000001-0000-4000-8000-000000000023', '03030303-0000-0000-0000-000000000023', '11000001-0000-4000-8000-000000000001', 42, 0),
    ('51000001-0000-4000-8000-000000000024', '03030303-0000-0000-0000-000000000024', '11000001-0000-4000-8000-000000000001', 33, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (
    id, role_id, phone, email, password_hash, status, full_name, gender, dob, created_at
) VALUES (
    'c1000001-0000-4000-8000-000000000034',
    '00000000-0000-0000-0000-000000000001',
    '0911000034',
    'vy.nguyen@example.com',
    'seed-not-for-login',
    'active',
    'Nguyễn Khánh Vy',
    'female',
    '1997-03-15',
    now() - interval '40 days'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name;

INSERT INTO addresses (id, user_id, recipient_name, phone, full_address, is_default) VALUES
    ('a1000001-0000-4000-8000-000000000041', 'c1000001-0000-4000-8000-000000000034', 'Nguyễn Khánh Vy', '0911000034', '26 Nguyễn Đình Chiểu, Q.1, TP.HCM', true)
ON CONFLICT (id) DO UPDATE SET
    recipient_name = EXCLUDED.recipient_name,
    full_address = EXCLUDED.full_address;

-- Máy, chưa có tay cầm → ACCESSORY_NEEDS_CONTROLLER
INSERT INTO orders (
    id, user_id, employee_id, address_id, shipping_address_snapshot,
    subtotal_amount, discount_amount, shipping_fee_amount, total_amount,
    status, warehouse_id, shipping_provider_name, tracking_no, shipment_status, created_at
) VALUES
    ('d2000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000015', 'e5555555-5555-5555-5555-555555555555', 'a1000001-0000-4000-8000-000000000022', '17 Hai Bà Trưng, Biên Hòa', 7990000.00, 0.00, 0.00, 7990000.00, 'delivered', '11000001-0000-4000-8000-000000000001', 'GHN', 'CTM-REC-001', 'delivered', now() - interval '12 days'),
    ('d2000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000028', 'e5555555-5555-5555-5555-555555555555', 'a1000001-0000-4000-8000-000000000035', '44 Hùng Vương, Tuy Hòa', 13490000.00, 0.00, 0.00, 13490000.00, 'delivered', '11000001-0000-4000-8000-000000000001', 'J&T', 'CTM-REC-002', 'delivered', now() - interval '9 days'),
    ('d2000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000031', 'e5555555-5555-5555-5555-555555555555', 'a1000001-0000-4000-8000-000000000038', '25 Lê Văn Sỹ, Q.3, TP.HCM', 9580000.00, 0.00, 0.00, 9580000.00, 'delivered', '11000001-0000-4000-8000-000000000001', 'GHTK', 'CTM-REC-003', 'delivered', now() - interval '7 days'),
    ('d2000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000034', 'e5555555-5555-5555-5555-555555555555', 'a1000001-0000-4000-8000-000000000041', '26 Nguyễn Đình Chiểu, Q.1, TP.HCM', 15380000.00, 0.00, 0.00, 15380000.00, 'delivered', '11000001-0000-4000-8000-000000000001', 'Viettel Post', 'CTM-REC-004', 'delivered', now() - interval '5 days')
ON CONFLICT (id) DO UPDATE SET
    shipping_address_snapshot = EXCLUDED.shipping_address_snapshot;

INSERT INTO order_items (id, order_id, variant_id, quantity, unit_price, line_total, product_name_snapshot) VALUES
    ('f2000001-0000-4000-8000-000000000001', 'd2000001-0000-4000-8000-000000000001', '03030303-0000-0000-0000-000000000017', 1, 7990000.00, 7990000.00, 'Máy Switch OLED'),
    ('f2000001-0000-4000-8000-000000000002', 'd2000001-0000-4000-8000-000000000002', '03030303-0000-0000-0000-000000000016', 1, 13490000.00, 13490000.00, 'Máy PS5 Slim'),
    ('f2000001-0000-4000-8000-000000000003', 'd2000001-0000-4000-8000-000000000003', '03030303-0000-0000-0000-000000000017', 1, 7990000.00, 7990000.00, 'Máy Switch OLED'),
    ('f2000001-0000-4000-8000-000000000004', 'd2000001-0000-4000-8000-000000000003', '03030303-0000-0000-0000-000000000003', 1, 1590000.00, 1590000.00, 'Tay cầm Switch Pro'),
    ('f2000001-0000-4000-8000-000000000005', 'd2000001-0000-4000-8000-000000000004', '03030303-0000-0000-0000-000000000016', 1, 13490000.00, 13490000.00, 'Máy PS5 Slim'),
    ('f2000001-0000-4000-8000-000000000006', 'd2000001-0000-4000-8000-000000000004', '03030303-0000-0000-0000-000000000001', 1, 1890000.00, 1890000.00, 'Tay cầm DualSense')
ON CONFLICT (id) DO UPDATE SET
    product_name_snapshot = EXCLUDED.product_name_snapshot;
