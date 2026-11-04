-- Indexes for foreign keys that frequent queries filter or join on (Postgres does not index foreign keys by itself).
-- Each one is named after the query it serves; none changes any data.

-- Stock held by open orders at checkout, management reports grouped by variant, recommendations, campaign audiences.
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);
-- Loyalty award / revoke on every delivery and refund ("points this order still holds").
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
-- Voucher checks at every checkout.
CREATE INDEX IF NOT EXISTS idx_voucher_usages_user_id ON voucher_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usages_order_id ON voucher_usages(order_id);
-- A customer's survey answers per order, and the survey sheet lookup.
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_order ON survey_responses(user_id, order_id);
-- Reviews by a buyer, segment memberships of a customer (RFM re-filing after each profile recalculation).
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_user_id ON segment_members(user_id);
-- The notification bell's unread count, polled every minute by every signed-in customer.
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
-- Delivery time of an order (CRM recency, revenue recognised on delivery).
CREATE INDEX IF NOT EXISTS idx_order_status_histories_order_status ON order_status_histories(order_id, status);
-- The scheduled-campaign dispatcher (every 15 s): only rows still waiting to be delivered.
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_due ON notifications(sent_at) WHERE status = 'scheduled';
