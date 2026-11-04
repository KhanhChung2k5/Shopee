-- Conditions every voucher / invoice promotion needs: a minimum order to qualify, a cap on what a percentage
-- can take off, and (vouchers) how many orders may use the code in total and whether it is for first orders only.
-- All nullable / defaulted: existing rows keep behaving exactly as before.
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(12,2);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC(12,2);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS usage_limit INTEGER;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS new_customers_only BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_min_order_amount_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_min_order_amount_check CHECK (min_order_amount IS NULL OR min_order_amount > 0);
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_max_discount_amount_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_max_discount_amount_check CHECK (max_discount_amount IS NULL OR max_discount_amount > 0);
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_usage_limit_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit > 0);

ALTER TABLE promotion_invoice_details ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(12,2);
ALTER TABLE promotion_invoice_details ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC(12,2);

ALTER TABLE promotion_invoice_details DROP CONSTRAINT IF EXISTS promotion_invoice_details_min_order_amount_check;
ALTER TABLE promotion_invoice_details ADD CONSTRAINT promotion_invoice_details_min_order_amount_check
    CHECK (min_order_amount IS NULL OR min_order_amount > 0);
ALTER TABLE promotion_invoice_details DROP CONSTRAINT IF EXISTS promotion_invoice_details_max_discount_amount_check;
ALTER TABLE promotion_invoice_details ADD CONSTRAINT promotion_invoice_details_max_discount_amount_check
    CHECK (max_discount_amount IS NULL OR max_discount_amount > 0);
