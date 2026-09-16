# Class Diagram — Hệ thống CRM + E-commerce (kiểu Shopee)

> **v2**: Có `ProductVariant` (SKU) — mỗi `Product` là "sản phẩm cha" (tên, mô tả, ảnh chung), còn giá/tồn kho/thuộc tính (màu/size...) nằm ở `ProductVariant`. Đây là thay đổi so với bản v1 (đã bỏ SKU) sau khi review lại: một sàn kiểu Shopee cần giá/tồn kho khác nhau theo từng tổ hợp biến thể.
> Diagram được chia theo 5 domain để dễ đọc: (A) Identity & Shop, (B) Catalog & Inventory, (C) Order & Transaction, (D) Marketing & Loyalty, (E) CRM & Customer Care.

---

## 0. Sơ đồ tổng quát (Overview — gộp cả 5 domain)

> Chỉ giữ tên class + quan hệ chính (bỏ thuộc tính/method) để nhìn toàn cảnh kiến trúc và cách 5 domain kết nối với nhau qua các entity dùng chung (`User`, `Shop`, `Product`, `ProductVariant`, `Order`).

```mermaid
classDiagram
    %% ===== A. Identity & Shop =====
    class User
    class UserProfile
    class Address
    class Role
    class Shop
    class ShopVerification
    class ShopStaff

    %% ===== B. Catalog & Inventory =====
    class Brand
    class Category
    class Product
    class ProductVariant
    class ProductImage
    class Warehouse
    class InventoryStock
    class InventoryMovement

    %% ===== C. Cart -> Checkout -> Order -> Payment -> Shipping =====
    class Cart
    class CartItem
    class Checkout
    class Order
    class OrderItem
    class OrderStatusHistory
    class Payment
    class Wallet
    class WalletTransaction
    class ShopWallet
    class ShopWalletTransaction
    class Payout
    class ShippingProvider
    class Shipment
    class ShipmentItem
    class ShipmentTracking
    class RefundReturn

    %% ===== D. Marketing & Loyalty =====
    class Voucher
    class VoucherUsage
    class FlashSale
    class FlashSaleItem
    class LoyaltyPoint
    class LoyaltyTransaction
    class Review
    class ReviewReply

    %% ===== E. CRM & Customer Care =====
    class CustomerProfileCRM
    class CustomerSegment
    class SegmentMember
    class Campaign
    class CampaignTarget
    class SupportTicket
    class TicketMessage
    class Agent
    class AgentAssignment
    class Conversation
    class ConversationMessage
    class InteractionLog
    class FeedbackSurvey
    class Notification

    %% --- A: Identity & Shop ---
    User --> UserProfile
    User --> Address
    Role --> User
    User --> Shop
    Shop --> ShopVerification
    Shop --> ShopStaff
    User --> ShopStaff

    %% --- B: Catalog & Inventory ---
    Brand --> Product
    Category --> Category
    Category --> Product
    Shop --> Product
    Product --> ProductVariant
    Product --> ProductImage
    Shop --> Warehouse
    ProductVariant --> InventoryStock
    Warehouse --> InventoryStock
    InventoryStock --> InventoryMovement
    Order --> InventoryMovement

    %% --- C: Cart/Checkout/Order/Payment/Shipping ---
    User --> Cart
    Cart --> CartItem
    ProductVariant --> CartItem
    User --> Checkout
    Address --> Checkout
    Checkout --> Order
    Shop --> Order
    Order --> OrderItem
    ProductVariant --> OrderItem
    Order --> OrderStatusHistory
    Checkout --> Payment
    Order --> Shipment
    ShippingProvider --> Shipment
    Warehouse --> Shipment
    Shipment --> ShipmentItem
    OrderItem --> ShipmentItem
    Shipment --> ShipmentTracking
    OrderItem --> RefundReturn
    RefundReturn --> WalletTransaction
    RefundReturn --> ShopWalletTransaction
    User --> Wallet
    Wallet --> WalletTransaction
    Wallet --> Payment
    Payment --> WalletTransaction
    Shop --> ShopWallet
    ShopWallet --> ShopWalletTransaction
    Order --> ShopWalletTransaction
    ShopWallet --> Payout

    %% --- D: Marketing & Loyalty ---
    Shop --> Voucher
    Voucher --> VoucherUsage
    User --> VoucherUsage
    Shop --> FlashSale
    FlashSale --> FlashSaleItem
    ProductVariant --> FlashSaleItem
    User --> LoyaltyPoint
    LoyaltyPoint --> LoyaltyTransaction
    Order --> LoyaltyTransaction
    User --> Review
    OrderItem --> Review
    Review --> ReviewReply

    %% --- E: CRM & Customer Care ---
    User --> CustomerProfileCRM
    CustomerProfileCRM --> SegmentMember
    CustomerSegment --> SegmentMember
    CustomerSegment --> CampaignTarget
    Campaign --> CampaignTarget
    User --> SupportTicket
    Order --> SupportTicket
    SupportTicket --> TicketMessage
    User --> Agent
    Agent --> AgentAssignment
    SupportTicket --> AgentAssignment
    User --> Conversation
    Shop --> Conversation
    Conversation --> ConversationMessage
    User --> InteractionLog
    Order --> FeedbackSurvey
    User --> Notification
    Campaign --> Notification
```

**Cách đọc nhanh:**
- 5 entity trung tâm nối cả 5 domain: `User`, `Shop`, `Product`/`ProductVariant`, `Order` — đây là các "trục" chia sẻ dữ liệu giữa các domain.
- Domain **A (Identity & Shop)** là gốc: mọi domain khác đều phụ thuộc vào `User` hoặc `Shop`.
- Domain **B (Catalog)** chỉ cắm vào A qua `Shop`, và là nguồn cho C, D qua `ProductVariant` (không phải `Product` trực tiếp — mọi giao dịch tham chiếu tới biến thể cụ thể).
- Domain **C (Order flow)** là domain lớn nhất: `Checkout` gộp nhiều `Order` (nhiều shop) lại để thanh toán 1 lần; mỗi `Order` phát sinh dòng tiền vào `ShopWalletTransaction` của shop (trừ hoa hồng) và có thể `Payout` ra ngoài.
- Domain **D (Marketing)** và **E (CRM)** đứng "trên cùng", tổng hợp dữ liệu từ A + C để phục vụ marketing và chăm sóc khách hàng — không có domain nào phụ thuộc ngược vào D/E.

---

## A. Identity & Shop

```mermaid
classDiagram
    class User {
        +UUID id
        +UUID roleId
        +String phone
        +String email
        +String passwordHash
        +String status
        +DateTime createdAt
        +DateTime lastLoginAt
        +register()
        +login()
        +updateProfile()
    }

    class UserProfile {
        +UUID userId
        +String fullName
        +String avatarUrl
        +String gender
        +Date dob
    }

    class Address {
        +UUID id
        +UUID userId
        +String recipientName
        +String phone
        +String fullAddress
        +Boolean isDefault
    }

    class Role {
        +UUID id
        +String name
    }

    class Shop {
        +UUID id
        +UUID ownerId
        +String name
        +String status
        +Float ratingAvg
        +DateTime createdAt
        +approve()
        +suspend()
    }

    class ShopVerification {
        +UUID id
        +UUID shopId
        +String businessLicenseUrl
        +String idCardUrl
        +String verifyStatus
    }

    class ShopStaff {
        +UUID id
        +UUID shopId
        +UUID userId
        +String permission
    }

    User "1" --> "1" UserProfile : has
    User "1" --> "*" Address : owns
    Role "1" --> "*" User : has
    User "1" --> "0..1" Shop : owns
    Shop "1" --> "1" ShopVerification : submits
    Shop "1" --> "*" ShopStaff : employs
    User "1" --> "*" ShopStaff : works_as
```

---

## B. Catalog & Inventory (có ProductVariant)

> Thay đổi so với v1: `Product` không còn giữ `price`/`attributes` trực tiếp. Một `Product` có thể có nhiều `ProductVariant` (tổ hợp màu/size...), mỗi variant có giá, tồn kho và ảnh riêng. Mọi tham chiếu trong giỏ hàng/đơn hàng/flash-sale đều trỏ tới `variantId`, không phải `productId`.

```mermaid
classDiagram
    class Brand {
        +UUID id
        +String name
        +String logoUrl
    }

    class Category {
        +UUID id
        +UUID parentId
        +String name
        +String slug
    }

    class Product {
        +UUID id
        +UUID shopId
        +UUID categoryId
        +UUID brandId
        +String name
        +Text description
        +String status
        +publish()
    }

    class ProductVariant {
        +UUID id
        +UUID productId
        +String sku
        +JSON attributes
        +Decimal price
        +Decimal comparePrice
        +String imageUrl
        +String status
        +updatePrice()
    }

    class ProductImage {
        +UUID id
        +UUID productId
        +String url
        +Int sortOrder
    }

    class Warehouse {
        +UUID id
        +UUID shopId
        +String name
        +String address
    }

    class InventoryStock {
        +UUID id
        +UUID variantId
        +UUID warehouseId
        +Int quantity
        +Int reservedQty
        +reserve()
        +release()
    }

    class InventoryMovement {
        +UUID id
        +UUID stockId
        +UUID orderId
        +String type
        +Int quantity
        +DateTime occurredAt
    }

    Brand "1" --> "*" Product : brands
    Category "1" --> "*" Category : parent_of
    Category "1" --> "*" Product : classifies
    Shop "1" --> "*" Product : sells
    Product "1" --> "*" ProductVariant : has
    Product "1" --> "*" ProductImage : has
    Shop "1" --> "*" Warehouse : owns
    ProductVariant "1" --> "*" InventoryStock : tracked_in
    Warehouse "1" --> "*" InventoryStock : stores
    InventoryStock "1" --> "*" InventoryMovement : logs
    Order "0..1" --> "*" InventoryMovement : triggers
```

---

## C. Cart → Checkout → Order → Payment → Shipping

> Thay đổi so với v1:
> - Thêm `Checkout`: đại diện cho **1 lần bấm "Đặt hàng"**, có thể sinh ra **nhiều `Order`** (mỗi Order = 1 shop) nhưng chỉ **1 lượt thanh toán** (`Payment` giờ gắn vào `Checkout`, không gắn thẳng vào `Order` nữa).
> - `OrderItem` có thêm snapshot (`productNameSnapshot`, `variantAttributesSnapshot`) để lịch sử đơn hàng không bị sai khi Product/Variant bị đổi tên hoặc xóa sau này.
> - `RefundReturn` gắn vào `OrderItem` (không phải cả `Order`) và là quan hệ 1–nhiều, vì Shopee cho hoàn từng sản phẩm và có thể có nhiều lần yêu cầu.
> - Thêm `ShipmentItem` để biết 1 kiện hàng chứa những `OrderItem` nào (hỗ trợ tách kiện khi giao nhiều lần).
> - Thêm `ShopWallet`/`ShopWalletTransaction`/`Payout` cho dòng tiền của người bán (doanh thu trừ hoa hồng, rút tiền).

```mermaid
classDiagram
    class Cart {
        +UUID id
        +UUID userId
        +DateTime updatedAt
    }

    class CartItem {
        +UUID id
        +UUID cartId
        +UUID variantId
        +Int quantity
        +Boolean isSelected
    }

    class Checkout {
        +UUID id
        +UUID userId
        +UUID addressId
        +Decimal totalAmount
        +String status
        +DateTime createdAt
    }

    class Order {
        +UUID id
        +UUID checkoutId
        +UUID shopId
        +Decimal subtotalAmount
        +Decimal discountAmount
        +Decimal shippingFeeAmount
        +Decimal totalAmount
        +Decimal commissionAmount
        +String status
        +DateTime createdAt
        +cancel()
        +confirm()
    }

    class OrderItem {
        +UUID id
        +UUID orderId
        +UUID variantId
        +Int quantity
        +Decimal unitPrice
        +String productNameSnapshot
        +JSON variantAttributesSnapshot
    }

    class OrderStatusHistory {
        +UUID id
        +UUID orderId
        +String status
        +UUID changedBy
        +String changedByType
        +String reason
        +DateTime changedAt
    }

    class Payment {
        +UUID id
        +UUID checkoutId
        +UUID walletId
        +String purpose
        +String method
        +Decimal amount
        +String status
        +DateTime paidAt
    }

    class Wallet {
        +UUID id
        +UUID userId
        +Decimal balance
    }

    class WalletTransaction {
        +UUID id
        +UUID walletId
        +String type
        +Decimal amount
        +DateTime createdAt
    }

    class ShopWallet {
        +UUID id
        +UUID shopId
        +Decimal balance
    }

    class ShopWalletTransaction {
        +UUID id
        +UUID shopWalletId
        +UUID orderId
        +String type
        +Decimal amount
        +DateTime createdAt
    }

    class Payout {
        +UUID id
        +UUID shopWalletId
        +Decimal amount
        +String status
        +DateTime requestedAt
        +DateTime paidAt
    }

    class ShippingProvider {
        +UUID id
        +String name
        +String code
    }

    class Shipment {
        +UUID id
        +UUID orderId
        +UUID providerId
        +UUID warehouseId
        +String trackingNo
        +String status
    }

    class ShipmentItem {
        +UUID id
        +UUID shipmentId
        +UUID orderItemId
        +Int quantity
    }

    class ShipmentTracking {
        +UUID id
        +UUID shipmentId
        +String statusText
        +DateTime occurredAt
    }

    class RefundReturn {
        +UUID id
        +UUID orderItemId
        +UUID walletTransactionId
        +UUID shopWalletTransactionId
        +String reason
        +String status
        +Decimal refundAmount
        +DateTime requestedAt
    }

    User "1" --> "1" Cart : owns
    Cart "1" --> "*" CartItem : contains
    ProductVariant "1" --> "*" CartItem : referenced_by
    User "1" --> "*" Checkout : initiates
    Address "1" --> "*" Checkout : ships_to
    Checkout "1" --> "*" Order : splits_into
    Shop "1" --> "*" Order : fulfills
    Order "1" --> "*" OrderItem : contains
    ProductVariant "1" --> "*" OrderItem : referenced_by
    Order "1" --> "*" OrderStatusHistory : tracks
    Checkout "1" --> "*" Payment : paid_by
    Wallet "1" --> "*" Payment : topped_up_by
    Order "1" --> "*" Shipment : shipped_via
    ShippingProvider "1" --> "*" Shipment : provides
    Warehouse "1" --> "*" Shipment : ships_from
    Shipment "1" --> "*" ShipmentItem : packs
    OrderItem "1" --> "*" ShipmentItem : shipped_as
    Shipment "1" --> "*" ShipmentTracking : logs
    OrderItem "1" --> "*" RefundReturn : may_have
    RefundReturn "1" --> "0..1" WalletTransaction : refunded_to_buyer
    RefundReturn "1" --> "0..1" ShopWalletTransaction : deducted_from_shop
    User "1" --> "1" Wallet : has
    Wallet "1" --> "*" WalletTransaction : records
    Payment "1" --> "0..1" WalletTransaction : credits_on_topup
    Shop "1" --> "1" ShopWallet : has
    ShopWallet "1" --> "*" ShopWalletTransaction : records
    Order "1" --> "*" ShopWalletTransaction : generates
    ShopWallet "1" --> "*" Payout : withdraws_from
```

---

## D. Marketing & Loyalty

> Thay đổi so với v1:
> - `Voucher.shopId` giờ là **0..1** để hỗ trợ voucher cấp sàn (platform-wide, không thuộc shop nào), thêm `scope` để phân biệt "platform" / "shop".
> - `FlashSaleItem` trỏ tới `variantId` thay vì `productId`.
> - `Review` bắt buộc gắn với `orderItemId` (thay vì chỉ `productId`) để enforce "chỉ review khi đã mua" (verified purchase).

```mermaid
classDiagram
    class Voucher {
        +UUID id
        +UUID shopId
        +String scope
        +String code
        +String type
        +Decimal value
        +DateTime expiresAt
    }

    class VoucherUsage {
        +UUID id
        +UUID voucherId
        +UUID userId
        +UUID orderId
        +DateTime usedAt
    }

    class FlashSale {
        +UUID id
        +UUID shopId
        +DateTime startAt
        +DateTime endAt
    }

    class FlashSaleItem {
        +UUID id
        +UUID flashSaleId
        +UUID variantId
        +Decimal flashPrice
        +Int limitQty
        +Int soldQty
    }

    class LoyaltyPoint {
        +UUID id
        +UUID userId
        +Int balance
        +String tier
    }

    class LoyaltyTransaction {
        +UUID id
        +UUID userId
        +UUID orderId
        +Int points
        +String reason
        +DateTime createdAt
    }

    class Review {
        +UUID id
        +UUID userId
        +UUID orderItemId
        +Int rating
        +Text comment
        +DateTime createdAt
    }

    class ReviewReply {
        +UUID id
        +UUID reviewId
        +UUID shopId
        +Text reply
    }

    Shop "0..1" --> "*" Voucher : issues
    Voucher "1" --> "*" VoucherUsage : used_in
    User "1" --> "*" VoucherUsage : redeems
    Shop "1" --> "*" FlashSale : runs
    FlashSale "1" --> "*" FlashSaleItem : includes
    ProductVariant "1" --> "*" FlashSaleItem : listed_in
    User "1" --> "1" LoyaltyPoint : accrues
    LoyaltyPoint "1" --> "*" LoyaltyTransaction : logs
    Order "0..1" --> "*" LoyaltyTransaction : earns_from
    User "1" --> "*" Review : writes
    OrderItem "1" --> "0..1" Review : reviewed_by
    Review "1" --> "0..1" ReviewReply : replied_by
```

---

## E. CRM & Customer Care

> Thay đổi so với v1:
> - `AgentAssignment` giờ là quan hệ 1–nhiều với `SupportTicket` (giữ lịch sử điều chuyển/escalate, có cờ `isCurrent`), thay vì 1–1.
> - Thêm `Conversation`/`ConversationMessage`: kênh chat trực tiếp **giữa khách và shop** (hỏi trước khi mua, khiếu nại với người bán) — tách biệt với `SupportTicket` (khách báo cáo lên sàn, có `Agent` của sàn xử lý).

```mermaid
classDiagram
    class CustomerProfileCRM {
        +UUID userId
        +Decimal ltv
        +Int totalOrders
        +Date lastPurchaseAt
        +String rfmSegment
        +recalculate()
    }

    class CustomerSegment {
        +UUID id
        +String name
        +JSON ruleDefinition
    }

    class SegmentMember {
        +UUID segmentId
        +UUID userId
        +DateTime addedAt
    }

    class Campaign {
        +UUID id
        +String name
        +String channel
        +DateTime startAt
        +DateTime endAt
    }

    class CampaignTarget {
        +UUID campaignId
        +UUID segmentId
    }

    class SupportTicket {
        +UUID id
        +UUID userId
        +UUID orderId
        +String channel
        +String status
        +String priority
        +DateTime createdAt
        +close()
        +escalate()
    }

    class TicketMessage {
        +UUID id
        +UUID ticketId
        +UUID senderId
        +Text content
        +DateTime sentAt
    }

    class Agent {
        +UUID id
        +UUID userId
        +String team
    }

    class AgentAssignment {
        +UUID id
        +UUID ticketId
        +UUID agentId
        +Boolean isCurrent
        +DateTime assignedAt
    }

    class Conversation {
        +UUID id
        +UUID userId
        +UUID shopId
        +DateTime lastMessageAt
    }

    class ConversationMessage {
        +UUID id
        +UUID conversationId
        +UUID senderId
        +Text content
        +DateTime sentAt
    }

    class InteractionLog {
        +UUID id
        +UUID userId
        +String type
        +JSON metadata
        +DateTime occurredAt
    }

    class FeedbackSurvey {
        +UUID id
        +UUID orderId
        +Int npsScore
        +Text comment
    }

    class Notification {
        +UUID id
        +UUID userId
        +String referenceType
        +UUID referenceId
        +String channel
        +String content
        +String status
        +DateTime sentAt
    }

    User "1" --> "1" CustomerProfileCRM : enriched_by
    CustomerProfileCRM "1" --> "*" SegmentMember : belongs_to
    CustomerSegment "1" --> "*" SegmentMember : groups
    CustomerSegment "1" --> "*" CampaignTarget : used_by
    Campaign "1" --> "*" CampaignTarget : targets
    User "1" --> "*" SupportTicket : opens
    Order "0..1" --> "*" SupportTicket : relates_to
    SupportTicket "1" --> "*" TicketMessage : contains
    User "1" --> "0..1" Agent : works_as
    Agent "1" --> "*" AgentAssignment : handles
    SupportTicket "1" --> "*" AgentAssignment : assigned_history
    User "1" --> "*" Conversation : chats
    Shop "1" --> "*" Conversation : chats
    Conversation "1" --> "*" ConversationMessage : contains
    User "1" --> "*" InteractionLog : generates
    Order "1" --> "0..1" FeedbackSurvey : triggers
    User "1" --> "*" Notification : receives
    Campaign "1" --> "*" Notification : sends_via_reference
```

---

## Ghi chú thay đổi (v1 → v2, sau review)

- **Thêm `ProductVariant`**: `Product` chỉ còn là "sản phẩm cha" (tên, mô tả, category, brand). Giá, `comparePrice`, `attributes` (màu/size...), ảnh đại diện và tồn kho chuyển hết sang `ProductVariant`. Lý do: một sàn kiểu Shopee bắt buộc phải hỗ trợ giá/tồn kho khác nhau theo tổ hợp biến thể — đây là hành vi tối thiểu, không phải tính năng phụ.
- **`CartItem`, `OrderItem`, `FlashSaleItem`, `InventoryStock`**: đổi tham chiếu từ `productId` sang `variantId`.
- **Thêm snapshot trên `OrderItem`** (`productNameSnapshot`, `variantAttributesSnapshot`): tránh lịch sử đơn hàng bị sai/lỗi khi sản phẩm bị đổi tên hoặc xóa sau này.
- **`Review` bắt buộc gắn `orderItemId`**: enforce "chỉ review khi đã mua" (verified purchase).
- **Thêm `Checkout`**: 1 lần đặt hàng có thể tách thành nhiều `Order` (nhiều shop) nhưng chỉ 1 lượt `Payment` — trước đây `Payment` gắn thẳng vào `Order` nên không mô hình được ca này.
- **`RefundReturn`** chuyển từ gắn `Order` (0..1) sang gắn `OrderItem` (1–nhiều): hỗ trợ hoàn trả từng sản phẩm và nhiều lần yêu cầu.
- **Thêm `ShipmentItem`**: biết 1 kiện hàng chứa những `OrderItem` nào, phục vụ tách kiện.
- **Thêm `ShopWallet` / `ShopWalletTransaction` / `Payout`** và field `commissionAmount` trên `Order`: mô hình dòng tiền của người bán (doanh thu, hoa hồng sàn thu, rút tiền) — phần lõi của mô hình kinh doanh marketplace, v1 chưa có.
- **`AgentAssignment`** đổi từ 1–1 sang 1–nhiều với `SupportTicket` (+ cờ `isCurrent`): giữ lịch sử điều chuyển/escalate.
- **Thêm `Conversation` / `ConversationMessage`**: kênh chat trực tiếp khách–shop, tách biệt với `SupportTicket` (khách báo cáo lên sàn, do `Agent` của sàn xử lý).
- **Thêm `Brand`**: sản phẩm có thương hiệu riêng, tách khỏi `Category`.
- **`Voucher`**: `shopId` chuyển thành 0..1 + thêm `scope` (`platform` / `shop`) để hỗ trợ voucher do chính sàn phát hành, không thuộc shop nào.
- Giữ nguyên quyết định gộp `UserRole` vào `User` (xem phần bên dưới) — quyết định này không liên quan tới các vấn đề trên và vẫn hợp lý.

## Ghi chú thay đổi (v2 → v3, sau review lần 2)

- **Thêm `addressId` vào `Checkout`**: trước đó không có cách nào biết đơn hàng giao tới địa chỉ nào — field bắt buộc, không phải chi tiết phụ.
- **Nối dòng tiền hoàn trả**: `RefundReturn` giờ có `walletTransactionId` (tiền trả về ví buyer) và `shopWalletTransactionId` (trừ khỏi ví shop), thay vì số tiền hoàn "treo lơ lửng" không phản ánh vào số dư của ai.
- **`Payout` gắn vào `ShopWallet`** (field `shopWalletId`) thay vì gắn thẳng `Shop`: nhất quán với pattern `Wallet` → `WalletTransaction`, vì payout thực chất là rút tiền từ số dư trong `ShopWallet`.
- **`Agent` liên kết `User`** (field `userId`, bỏ field `name` trùng lặp với `UserProfile.fullName`): nhân viên CS dùng chung hệ đăng nhập với `User` thay vì có identity tách biệt.
- **`Campaign` nối với `Notification`** (field `referenceType`/`referenceId` trên `Notification`, xem chi tiết ở mục polymorphic reference bên dưới): biết được một chiến dịch CRM đã gửi những thông báo nào tới khách, phục vụ đo hiệu quả campaign.

## Ghi chú thay đổi (v3 → v4, bổ sung sau review lần 3)

- **Thêm `subtotalAmount` / `discountAmount` / `shippingFeeAmount` vào `Order`** (bên cạnh `totalAmount`, `commissionAmount` đã có): tách rõ cấu thành số tiền thay vì `totalAmount` là một con số "hộp đen" — cần thiết để tính hoàn tiền từng phần chính xác và để báo cáo doanh thu/CRM (LTV, AOV) không lẫn phí ship vào doanh thu sản phẩm.
- **Thêm `changedBy` / `changedByType` / `reason` vào `OrderStatusHistory`**: biết ai đổi trạng thái đơn (buyer/seller/admin/system) và vì sao — phục vụ tra cứu khi có khiếu nại/tranh chấp về việc đơn bị huỷ hoặc đổi trạng thái ngoài ý muốn.
- **Đổi `campaignId` trên `Notification` thành `referenceType` + `referenceId` (polymorphic reference)**: một `Notification` có thể phát sinh từ nhiều nguồn khác nhau (Order đổi trạng thái, SupportTicket có phản hồi mới, Conversation có tin nhắn mới, Campaign gửi hàng loạt...). Dùng 1 cặp field tổng quát (`referenceType`: "order"/"ticket"/"campaign"/"conversation", `referenceId`: UUID trỏ tới bản ghi tương ứng) thay vì phải thêm cột FK riêng mỗi khi có nguồn thông báo mới. Quan hệ `Campaign --> Notification` trong sơ đồ vẫn giữ nguyên về mặt khái niệm, chỉ khác là được hiện thực qua `referenceId` thay vì cột FK trực tiếp.
- **Thêm `isSelected` vào `CartItem`**: Shopee cho phép khách tick chọn từng sản phẩm trong giỏ để mua ngay, không bắt buộc checkout toàn bộ giỏ hàng — thiếu field này thì không lưu được trạng thái lựa chọn giữa các lần truy cập/thiết bị.

## Ghi chú thay đổi (v4 → v5, sau khi trace toàn bộ luồng nghiệp vụ)

> Khác với các vòng review trước (soi từng entity/quan hệ), vòng này trace end-to-end các luồng chính (browse → cart → checkout → order → thanh toán → giao hàng → hoàn tiền, loyalty, nạp ví) để tìm chỗ "đứt mạch" khi truy vết ngược một giao dịch.

- **Thêm `orderId` vào `InventoryMovement`**: trước đó không biết một lần trừ/cộng tồn kho là do đơn hàng nào gây ra — không đối soát được kho khi có tranh chấp về tồn kho.
- **Thêm `warehouseId` vào `Shipment`**: một Shop có thể có nhiều Warehouse; thiếu field này thì không biết kiện hàng được đóng gói/xuất từ kho nào.
- **Thêm `orderId` vào `LoyaltyTransaction`**: biết chính xác điểm thưởng được cộng/trừ vì đơn hàng nào, thay vì chỉ dựa vào field `reason` dạng text tự do (không tra cứu được).
- **`Payment` hỗ trợ cả nạp ví lẫn thanh toán đơn hàng**: thêm `walletId` (nullable) và `purpose` ("checkout" / "wallet_topup") bên cạnh `checkoutId` (giờ cũng nullable). Trước đó `checkoutId` bắt buộc khiến luồng "nạp tiền vào ví" (không gắn với đơn hàng nào) không có chỗ để lưu — phải ghi thẳng vào `WalletTransaction` mà bỏ qua bước xác nhận thanh toán thật. Thêm quan hệ `Payment "1" --> "0..1" WalletTransaction : credits_on_topup` để nối 2 bước lại.

## Gộp UserRole vào User — có đánh đổi gì?

**Được lợi:**
- Query "lấy role của user" hoặc "lọc user theo role" không cần `JOIN` nữa — chỉ `WHERE role_id = ?`, nhanh hơn và đơn giản hơn khi có index trên `role_id`.
- Ít bảng, ít write (insert user chỉ 1 câu INSERT thay vì 2).

**Mất gì:**
- Chỉ còn hỗ trợ **1 user – 1 role tại một thời điểm**. Nếu nghiệp vụ cần multi-role thật (vd: một user vừa là buyer vừa là CS agent vừa là seller-staff cùng lúc, cần bật/tắt độc lập), cấu trúc này không biểu diễn được — phải thêm cột enum bitmask hoặc quay lại bảng trung gian.
- Trong hệ thống này thì **không sao**, vì các vai trò đặc biệt (bán hàng, CS) đã có bảng riêng đại diện quan hệ nhiều-nhiều rồi:
  - "Seller" → thể hiện qua `Shop.ownerId` (User owns Shop).
  - "Shop staff nhiều quyền" → đã có `ShopStaff` (userId + shopId + permission) — đây mới là chỗ cần many-to-many, không phải ở `Role`.
  - "CS Agent" → bảng `Agent` riêng.
- Vậy `Role` trên `User` chỉ cần đại diện vai trò **hệ thống cấp cao, loại trừ nhau** (buyer / admin / cs_agent...), nên gộp 1-1 là hợp lý và không làm giảm tối ưu — ngược lại còn nhanh hơn vì bớt 1 JOIN ở hầu hết query auth/permission (vốn là đường nóng, chạy mỗi request).

**Kết luận:** gộp không giảm tối ưu ở đây, mà còn tăng tốc do bớt JOIN — miễn là bạn chấp nhận ràng buộc "mỗi user 1 role hệ thống", còn multi-role nghiệp vụ thực (bán/CS) đã được tách sang các bảng chuyên biệt.
