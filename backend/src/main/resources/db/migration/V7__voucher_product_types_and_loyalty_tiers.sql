-- 1) Voucher dành cho loại sản phẩm nào: mảng product_type (game_disc | controller | accessory).
--    Mảng rỗng = áp dụng mọi sản phẩm. Voucher chỉ giảm trên tiền các món thuộc loại đó.
ALTER TABLE vouchers
    ADD COLUMN IF NOT EXISTS target_product_types JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) Hạng thành viên cố định (LoyaltyTier): bronze < silver < gold < diamond, theo tổng điểm từng tích luỹ.
--    Trước đây cột này là chữ tự do và không bao giờ được cập nhật (mọi khách đều NULL).
UPDATE promotion_programs
SET target_loyalty_tier = lower(trim(target_loyalty_tier))
WHERE target_loyalty_tier IS NOT NULL;
UPDATE promotion_programs
SET target_loyalty_tier = NULL
WHERE target_loyalty_tier NOT IN ('bronze', 'silver', 'gold', 'diamond');
ALTER TABLE promotion_programs
    ADD CONSTRAINT chk_promotion_programs_target_tier
    CHECK (target_loyalty_tier IS NULL OR target_loyalty_tier IN ('bronze', 'silver', 'gold', 'diamond'));

-- Xếp hạng lại mọi khách theo điểm đã tích luỹ (ngưỡng khớp LoyaltyTier: 500 / 2.000 / 5.000).
UPDATE users u
SET loyalty_tier = CASE
        WHEN earned.points >= 5000 THEN 'diamond'
        WHEN earned.points >= 2000 THEN 'gold'
        WHEN earned.points >= 500  THEN 'silver'
        ELSE 'bronze'
    END
FROM (
    SELECT u2.id, COALESCE(SUM(lt.points) FILTER (WHERE lt.points > 0), 0) AS points
    FROM users u2
    LEFT JOIN loyalty_transactions lt ON lt.user_id = u2.id
    WHERE u2.role = 'buyer'
    GROUP BY u2.id
) earned
WHERE earned.id = u.id;
