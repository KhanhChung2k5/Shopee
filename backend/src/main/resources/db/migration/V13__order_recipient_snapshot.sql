-- Who the parcel goes to, frozen at checkout like shipping_address_snapshot: editing the address book afterwards
-- must not change the recipient of an order already placed.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name_snapshot VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone_snapshot VARCHAR(20);

-- Existing orders: the best record left is the address as it is today.
UPDATE orders o
SET recipient_name_snapshot = a.recipient_name,
    recipient_phone_snapshot = a.phone
FROM addresses a
WHERE a.id = o.address_id
  AND o.recipient_name_snapshot IS NULL;
