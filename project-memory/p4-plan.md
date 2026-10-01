# P4 Plan - Payment, Wallet, Refund, Marketing, Loyalty

## Scope

P4 gom:

- Payment: thanh toan don hang va nap vi.
- Wallet: so du nam trong `users.wallet_balance`, lich su o `wallet_transactions`.
- RefundReturn: yeu cau doi tra/hoan tien theo `order_item_id`.
- Marketing: promotion program, voucher, flash sale/product promotion, invoice promotion.
- Loyalty: cong/tru diem va cap bac thanh vien.
- Review: buyer danh gia `order_item` da mua, staff phan hoi neu can.

## Suggested Implementation Order

1. Wallet topup
   - Entity/repository cho `Payment`, `WalletTransaction`.
   - API buyer nap vi, tao payment purpose `wallet_topup`, tao wallet transaction `topup`, cong `users.wallet_balance`.

2. Marketing CRUD
   - Entity/repository/service/controller cho `PromotionProgram`, `Voucher`, `PromotionProductDetail`, `PromotionInvoiceDetail`.
   - Staff `sales/admin` quan ly.

3. Voucher apply helper
   - Service tinh discount tu voucher/promotion.
   - Chua can noi checkout that neu P3 chua xong; tao helper/service de P3 goi sau.

4. Review
   - Buyer tao review theo `order_item_id`.
   - Can kiem tra ownership khi Order/OrderItem entity co san.

5. Refund
   - Buyer tao refund request theo `order_item_id`.
   - CS/admin duyet/tu choi.
   - Khi duyet: tao wallet transaction `refund`, cong wallet buyer.
   - Phu thuoc Order/OrderItem de tinh ownership va refund amount chinh xac.

6. Loyalty
   - Service cong diem khi order delivered.
   - Co the tao skeleton truoc, noi event/endpoint that sau khi P3 co order lifecycle.

## Dependencies

- P1 da du cho auth/user context.
- P2/P3 can cho luong that lien quan `product_variants`, `orders`, `order_items`.
- Neu P2/P3 chua xong, P4 nen uu tien phan it phu thuoc: wallet topup va marketing CRUD.

## Decisions confirmed with the owner (2026-10-01)

- Follow the implementation order above; finish and verify each coherent checkpoint before moving on.
- Payment is simulated. A wallet top-up can be marked paid immediately; no real gateway or bank callback is involved. The API and UI must state this clearly.
- Buyer may operate only on their own wallet, payments, reviews and refund requests. Sales/admin manage marketing; CS/admin handle refunds.
- Keep code organized and reusable; commit frequently at meaningful checkpoints.

## API Direction

- Buyer:
  - `GET /wallet/transactions`
  - `POST /wallet/topups`
  - `POST /payments`
  - `POST /refund-returns`
  - `POST /reviews`

- Staff sales/admin:
  - CRUD `/promotion-programs`
  - CRUD `/vouchers`
  - CRUD `/promotion-product-details`
  - CRUD `/promotion-invoice-details`

- Staff cs/admin:
  - `GET /refund-returns`
  - `PATCH /refund-returns/{id}/approve`
  - `PATCH /refund-returns/{id}/reject`

## Implemented wallet contract

- `GET /wallet` returns `{ balance }` for the authenticated buyer.
- `GET /wallet/transactions` returns the buyer's ledger entries newest first.
- `POST /wallet/topups` accepts `{ amount }` and returns payment id/status, ledger entry, new balance, and `simulated: true`.
- Top-up uses a simulated `bank_transfer` payment with status `paid`; no real transfer is involved.
- The authenticated buyer id comes from JWT. A database row lock serializes top-ups to the same wallet; the payment, ledger and balance update commit together.

## Implemented marketing contract

- Sales/admin CRUD `GET/POST /marketing/programs`, `PUT/DELETE /marketing/programs/{id}`.
- Sales/admin CRUD `GET/POST /marketing/vouchers`, `PUT/DELETE /marketing/vouchers/{id}`.
- Codes are normalized to uppercase and checked for duplicates. Program end must follow start; voucher values and expiry are validated.
- Admin Marketing page consumes these APIs. Program and voucher management no longer uses sample data.
- Product and invoice discount details, customer voucher discovery and checkout application are separate follow-up work.

## Implemented discount detail contract

- Sales/admin CRUD `GET/POST /marketing/product-discounts`, `PUT/DELETE /marketing/product-discounts/{id}`.
- Sales/admin CRUD `GET/POST /marketing/invoice-discounts`, `PUT/DELETE /marketing/invoice-discounts/{id}`.
- Product detail uses either `discountPercent` or `flashPrice` plus `limitQty`; invoice detail uses either `discountAmount` or `discountPercent`.
- SKU detail requires an existing `product_variants.id`. Until P2 exposes variant search, admin enters that UUID manually.
- Deleting a program requires first removing its vouchers and discount details. A flash sale detail with `soldQty > 0` cannot be edited or deleted.
- Checkout calculation and sold quantity updates still need P3 integration.

## Implemented voucher quote contract

- Buyer `POST /vouchers/quote` with `{ code, subtotal }` returns discount and payable amount.
- It checks program time window, voucher expiry, loyalty tier and caps discount at subtotal.
- `subtotal` is client supplied, so this endpoint is preview only. P3 checkout must call the same service with a server calculated subtotal before recording voucher usage.
