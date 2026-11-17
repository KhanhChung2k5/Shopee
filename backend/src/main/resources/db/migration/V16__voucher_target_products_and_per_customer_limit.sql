-- 1) A voucher can now target specific products as well as product types: it covers a cart line whose product type
--    is in target_product_types OR whose product is in target_product_ids. Both empty = every product, as before.
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS target_product_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) How many orders (not cancelled) ONE buyer may use the code on. Existing vouchers get 1, which is exactly the
--    old "once per buyer" rule; NULL = unlimited per buyer (the total usage_limit still applies).
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS per_customer_limit INTEGER DEFAULT 1;
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_per_customer_limit_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_per_customer_limit_check
    CHECK (per_customer_limit IS NULL OR per_customer_limit > 0);
