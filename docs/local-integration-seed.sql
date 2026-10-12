-- Optional local-only fixture for manually testing P2 catalog -> P3 checkout -> P4 voucher.
-- Run against a disposable/local database only. Stable IDs/SKUs keep this script idempotent.
BEGIN;

INSERT INTO categories (id, name, slug) VALUES
  ('10000000-0000-4000-8000-000000000101', 'Đĩa game', 'dia-game'),
  ('10000000-0000-4000-8000-000000000102', 'Tay cầm', 'tay-cam'),
  ('10000000-0000-4000-8000-000000000103', 'Phụ kiện', 'phu-kien')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, category_id, brand_name, name, description, status, product_type,
                      platforms, publisher, genre, age_rating, image_urls) VALUES
  ('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101',
   'Sony', 'Astro Bot PS5', 'Đĩa game Astro Bot cho PlayStation 5.', 'published', 'game_disc',
   '["PS5"]'::jsonb, 'Sony Interactive Entertainment', 'Phiêu lưu', 'E10+', '[]'::jsonb),
  ('20000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000102',
   'Sony', 'Tay cầm DualSense', 'Tay cầm không dây cho PlayStation 5.', 'published', 'controller',
   '["PS5","PC"]'::jsonb, NULL, NULL, NULL, '[]'::jsonb),
  ('20000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000103',
   'Sony', 'Đế sạc DualSense', 'Đế sạc hai tay cầm DualSense.', 'published', 'accessory',
   '["PS5"]'::jsonb, NULL, NULL, NULL, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, sku, attributes, price, compare_price, status) VALUES
  ('30000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000101',
   'LOCAL-ASTRO-PS5', '{"edition":"Standard"}'::jsonb, 1290000, 1490000, 'active'),
  ('30000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000102',
   'LOCAL-DUALSENSE-WHITE', '{"color":"Trắng"}'::jsonb, 1590000, 1790000, 'active'),
  ('30000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-000000000103',
   'LOCAL-CHARGING-DOCK', '{"color":"Trắng"}'::jsonb, 890000, 990000, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouses (id, name, address) VALUES
  ('40000000-0000-4000-8000-000000000101', 'Kho thử nghiệm local', 'Hồ Chí Minh')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_stocks (id, variant_id, warehouse_id, quantity, reserved_qty) VALUES
  ('50000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000101',
   '40000000-0000-4000-8000-000000000101', 20, 0),
  ('50000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000102',
   '40000000-0000-4000-8000-000000000101', 20, 0),
  ('50000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000103',
   '40000000-0000-4000-8000-000000000101', 20, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO promotion_programs (id, code, name, program_type, start_at, end_at) VALUES
  ('60000000-0000-4000-8000-000000000101', 'LOCAL-CHECKOUT',
   'Ưu đãi thử thanh toán local', 'seasonal', now() - interval '1 day', now() + interval '90 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vouchers (id, promotion_program_id, code, type, value) VALUES
  ('70000000-0000-4000-8000-000000000101', '60000000-0000-4000-8000-000000000101',
   'LOCAL10', 'percentage', 10),
  ('70000000-0000-4000-8000-000000000102', '60000000-0000-4000-8000-000000000101',
   'LOCAL100K', 'fixed_amount', 100000)
ON CONFLICT (id) DO NOTHING;

COMMIT;
