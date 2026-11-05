-- Sales invoices (hoá đơn bán hàng). One is issued automatically when an order is delivered (it is paid by then:
-- cash on delivery is collected at the door, a bank transfer must arrive before the order can be packed).
-- Selling prices include 10% VAT, so the invoice splits the amount paid into goods before tax and tax.
-- An invoice is never edited: sales/admin cancel it and issue a replacement (e.g. with the buyer's company and tax code).
-- The lines of the invoice are the order's lines (order_items), whose name, price and quantity are frozen at checkout.

CREATE SEQUENCE IF NOT EXISTS invoice_no_seq;

CREATE TABLE IF NOT EXISTS invoices (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no           VARCHAR(30)   NOT NULL UNIQUE,
    order_id             UUID          NOT NULL REFERENCES orders(id),
    status               VARCHAR(20)   NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'cancelled')),
    buyer_name           VARCHAR(255)  NOT NULL,
    buyer_company        VARCHAR(255),
    buyer_tax_code       VARCHAR(20),
    buyer_address        VARCHAR(500),
    buyer_email          VARCHAR(255),
    buyer_phone          VARCHAR(20),
    payment_method       VARCHAR(20),
    goods_amount         NUMERIC(12,2) NOT NULL,
    discount_amount      NUMERIC(12,2) NOT NULL,
    shipping_fee_amount  NUMERIC(12,2) NOT NULL,
    total_amount         NUMERIC(12,2) NOT NULL,
    vat_rate             NUMERIC(5,2)  NOT NULL,
    pre_tax_amount       NUMERIC(12,2) NOT NULL,
    vat_amount           NUMERIC(12,2) NOT NULL,
    issued_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    issued_by            UUID REFERENCES employees(id),
    cancelled_at         TIMESTAMPTZ,
    cancelled_by         UUID REFERENCES employees(id),
    cancel_reason        VARCHAR(500),
    replaces_invoice_id  UUID REFERENCES invoices(id),
    CHECK (total_amount = pre_tax_amount + vat_amount)
);

-- At most one valid invoice per order; cancelled ones stay as history.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_order_issued ON invoices(order_id) WHERE status = 'issued';
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- Orders already delivered get their invoice now, numbered in the order they were delivered.
WITH delivered AS (
    SELECT o.id AS order_id,
           COALESCE((SELECT MAX(h.changed_at) FROM order_status_histories h WHERE h.order_id = o.id AND h.status = 'delivered'),
                    o.created_at) AS delivered_at,
           COALESCE(NULLIF(o.recipient_name_snapshot, ''), u.full_name, 'Khách hàng') AS buyer_name,
           o.shipping_address_snapshot AS buyer_address,
           u.email AS buyer_email,
           COALESCE(o.recipient_phone_snapshot, u.phone) AS buyer_phone,
           (SELECT p.method FROM payments p WHERE p.order_id = o.id AND p.purpose = 'checkout' ORDER BY p.paid_at NULLS LAST LIMIT 1) AS payment_method,
           o.subtotal_amount, o.discount_amount, o.shipping_fee_amount, o.total_amount,
           ROUND(o.total_amount / 1.10, 0) AS pre_tax_amount
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.status = 'delivered'
      AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id)
), numbered AS (
    SELECT d.*, ROW_NUMBER() OVER (ORDER BY d.delivered_at, d.order_id) + (SELECT COUNT(*) FROM invoices) AS n
    FROM delivered d
)
INSERT INTO invoices (invoice_no, order_id, buyer_name, buyer_address, buyer_email, buyer_phone, payment_method,
                      goods_amount, discount_amount, shipping_fee_amount, total_amount, vat_rate, pre_tax_amount, vat_amount, issued_at)
SELECT 'HD' || LPAD(n::text, 6, '0'), order_id, buyer_name, buyer_address, buyer_email, buyer_phone, payment_method,
       subtotal_amount, discount_amount, shipping_fee_amount, total_amount, 10, pre_tax_amount, total_amount - pre_tax_amount, delivered_at
FROM numbered;

SELECT setval('invoice_no_seq', GREATEST((SELECT COUNT(*) FROM invoices), 1), (SELECT COUNT(*) FROM invoices) > 0);
