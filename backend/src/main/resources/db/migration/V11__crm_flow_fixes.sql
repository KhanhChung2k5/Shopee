-- CRM flow fixes.
-- 1. A campaign keeps the survey it carries (campaigns.survey_id), and every in-app notification records which
--    campaign sent it and, for post-purchase surveys, which order it is about. Campaign screens then count, edit
--    and delete only their own notifications, never the automatic post-delivery invitations.
-- 2. A post-purchase survey is answered once per order (not once per customer).
-- 3. Support conversations remember when they were closed (resolution time).
-- 4. LTV is split from the money actually spent: users.total_spent holds net historical spend.

ALTER TABLE campaigns ADD COLUMN survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL;

ALTER TABLE notifications
    ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    ADD COLUMN order_id UUID REFERENCES orders(id);
CREATE INDEX idx_notifications_campaign_id ON notifications(campaign_id);
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);

-- Plain campaign notifications already point at their campaign.
UPDATE notifications n SET campaign_id = n.reference_id
WHERE n.reference_type = 'campaign' AND EXISTS (SELECT 1 FROM campaigns c WHERE c.id = n.reference_id);

-- Post-delivery survey invitations: tie each one to the delivered order it was dispatched for. Pair the n-th
-- invitation of a customer with the n-th dispatch record of that customer and survey, only where both counts agree
-- (an invitation sent straight to the inbox, without an order, then stays unlinked).
WITH dispatched AS (
    SELECT d.survey_id, o.user_id, d.order_id,
           row_number() OVER (PARTITION BY d.survey_id, o.user_id ORDER BY d.dispatched_at, d.order_id) AS rn,
           count(*) OVER (PARTITION BY d.survey_id, o.user_id) AS total
    FROM survey_order_dispatches d JOIN orders o ON o.id = d.order_id
), invited AS (
    SELECT n.id, n.reference_id AS survey_id, n.user_id,
           row_number() OVER (PARTITION BY n.reference_id, n.user_id ORDER BY n.sent_at, n.id) AS rn,
           count(*) OVER (PARTITION BY n.reference_id, n.user_id) AS total
    FROM notifications n WHERE n.reference_type = 'survey'
)
UPDATE notifications n SET order_id = d.order_id
FROM invited i
JOIN dispatched d ON d.survey_id = i.survey_id AND d.user_id = i.user_id AND d.rn = i.rn AND d.total = i.total
WHERE n.id = i.id;

-- Answers given before this change carry no order: attach each to the latest order the customer had been invited
-- for by the time they answered (or, failing that, to their latest invited order).
UPDATE survey_responses r SET order_id = (
    SELECT n.order_id FROM notifications n JOIN orders o ON o.id = n.order_id
    WHERE n.reference_type = 'survey' AND n.reference_id = r.survey_id AND n.user_id = r.user_id
    ORDER BY (o.created_at <= r.submitted_at) DESC, o.created_at DESC, n.id DESC LIMIT 1)
WHERE r.order_id IS NULL;

ALTER TABLE survey_responses DROP CONSTRAINT survey_responses_survey_id_user_id_key;
ALTER TABLE survey_responses ADD CONSTRAINT uq_survey_responses_survey_user_order
    UNIQUE NULLS NOT DISTINCT (survey_id, user_id, order_id);

ALTER TABLE conversations ADD COLUMN closed_at TIMESTAMPTZ;
UPDATE conversations SET closed_at = last_message_at WHERE status = 'closed';
-- "In progress" means someone is handling it: conversations nobody has picked up go back to the open queue.
UPDATE conversations c SET status = 'open'
WHERE c.status = 'in_progress'
  AND NOT EXISTS (SELECT 1 FROM agent_assignments a WHERE a.conversation_id = c.id AND a.is_current);

ALTER TABLE users ADD COLUMN total_spent NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- Every buyer holds a loyalty tier; one with no points yet is Bronze.
UPDATE users SET loyalty_tier = 'bronze' WHERE role = 'buyer' AND loyalty_tier IS NULL;
