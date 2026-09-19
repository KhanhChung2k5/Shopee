# Tổng quan luồng hoạt động hệ thống — Chợ Tốt Mua

> Tài liệu tổng quan dùng để trao đổi và chốt phương án triển khai trong nhóm.
> Nguồn sự thật chi tiết về dữ liệu vẫn là `crm-ecommerce-class-diagram.md`
> (class diagram) — tài liệu này chỉ tổng hợp lại ở mức **luồng hoạt động**
> (chức năng, tác nhân, dữ liệu, hành trình người dùng) để dễ nhìn toàn cảnh.

## 1. Giới thiệu hệ thống

**Chợ Tốt Mua** là hệ thống bán lẻ trực tuyến chuyên **tay cầm chơi game và đĩa game**, kết hợp module CRM (chăm sóc khách hàng) ngay trong cùng nền tảng — không phải sàn thương mại điện tử đa gian hàng, mà là hệ thống của **một doanh nghiệp bán lẻ duy nhất**.

Thành phần chính:
- **Web app** (React) — khách hàng mua sắm, trang quản trị (Admin) riêng biệt.
- **Mobile app** (Flutter) — khách hàng mua sắm trên di động.
- **Backend API** (Spring Boot) — xử lý nghiệp vụ, kết nối CSDL.
- **CSDL** (PostgreSQL, 45 bảng, 5 domain nghiệp vụ).

## 2. Sơ đồ chức năng hệ thống

```mermaid
graph TD
    HT["HỆ THỐNG<br/>CHỢ TỐT MUA"]

    HT --> QL[1. Quản lý Người dùng & Nhân sự]
    HT --> SP[2. Quản lý Sản phẩm & Kho]
    HT --> DH[3. Quản lý Đơn hàng & Thanh toán]
    HT --> MK[4. Marketing & Khuyến mãi]
    HT --> CRM[5. Chăm sóc Khách hàng & CRM]

    QL --> QL1[Đăng ký / Đăng nhập]
    QL --> QL2[Quản lý hồ sơ cá nhân]
    QL --> QL3[Quản lý nhân viên nội bộ]
    QL --> QL4[Phân quyền theo phòng ban]

    SP --> SP1[Quản lý danh mục / thương hiệu]
    SP --> SP2[Quản lý sản phẩm & biến thể]
    SP --> SP3[Quản lý kho hàng]
    SP --> SP4[Theo dõi nhập/xuất tồn kho]

    DH --> DH1[Giỏ hàng]
    DH --> DH2[Đặt hàng / Checkout]
    DH --> DH3[Thanh toán & Ví điện tử]
    DH --> DH4[Giao hàng & Vận chuyển]
    DH --> DH5[Đổi trả & Hoàn tiền]

    MK --> MK1[Voucher / Mã giảm giá]
    MK --> MK2[Flash Sale]
    MK --> MK3[Tích điểm thành viên]
    MK --> MK4[Đánh giá sản phẩm]

    CRM --> CRM1[Quản lý khách hàng<br/>thêm/khóa/xóa mềm]
    CRM --> CRM2[Phân khúc khách hàng]
    CRM --> CRM3[Chiến dịch & Thông báo]
    CRM --> CRM4[Hỗ trợ / Ticket / Chat]
    CRM --> CRM5[Khảo sát khách hàng]
    CRM --> CRM6[Báo cáo nhân khẩu học]
```

## 3. Sơ đồ Use Case (actor ↔ chức năng)

```mermaid
graph LR
    KH((Khách hàng))
    NVBH((Nhân viên<br/>Kinh doanh))
    NVK((Nhân viên<br/>Kho vận))
    NVCS((Nhân viên<br/>CSKH))
    ADMIN((Quản trị viên))

    subgraph SG_KH ["Khách hàng"]
        UC1([Đăng ký / Đăng nhập])
        UC2([Duyệt & tìm kiếm sản phẩm])
        UC3([Quản lý giỏ hàng])
        UC4([Đặt hàng & thanh toán])
        UC5([Theo dõi đơn hàng])
        UC6([Yêu cầu đổi trả])
        UC7([Đánh giá sản phẩm])
        UC8([Trả lời khảo sát])
    end

    subgraph SG_SALES ["Nhân viên Kinh doanh"]
        UC9([Quản lý sản phẩm & biến thể])
        UC10([Quản lý voucher / flash sale])
        UC11([Xem báo cáo doanh số])
    end

    subgraph SG_WH ["Nhân viên Kho vận"]
        UC12([Cập nhật tồn kho])
        UC13([Xác nhận đóng gói & tạo vận đơn])
    end

    subgraph SG_CS ["Nhân viên CSKH"]
        UC14([Xử lý hội thoại / ticket])
        UC15([Tạo & gửi khảo sát])
        UC16([Duyệt yêu cầu đổi trả])
    end

    subgraph SG_ADMIN ["Quản trị viên"]
        UC17([Quản lý tài khoản khách hàng])
        UC18([Phân quyền nhân viên])
        UC19([Xem báo cáo nhân khẩu học])
    end

    KH --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
    NVBH --> UC9 & UC10 & UC11
    NVK --> UC12 & UC13
    NVCS --> UC14 & UC15 & UC16
    ADMIN --> UC17 & UC18 & UC19
```

## 4. Sơ đồ ngữ cảnh (tác nhân & luồng thông tin)

```mermaid
graph LR
    KH((Khách hàng))
    NVBH((Nhân viên<br/>Kinh doanh))
    NVK((Nhân viên<br/>Kho vận))
    NVCS((Nhân viên<br/>CSKH))
    ADMIN((Quản trị viên))
    DVVC((Đơn vị<br/>vận chuyển))

    HT{{"HỆ THỐNG<br/>CHỢ TỐT MUA"}}

    KH -- "Đăng ký, đặt hàng,<br/>thanh toán, phản hồi,<br/>trả lời khảo sát" --> HT
    HT -- "Xác nhận đơn,<br/>trạng thái giao hàng,<br/>thông báo, khảo sát" --> KH

    NVBH -- "Cập nhật sản phẩm,<br/>giá, khuyến mãi" --> HT
    HT -- "Báo cáo doanh số" --> NVBH

    NVK -- "Cập nhật tồn kho,<br/>xác nhận xuất kho" --> HT
    HT -- "Danh sách đơn cần đóng gói" --> NVK

    NVCS -- "Xử lý ticket,<br/>trả lời chat,<br/>tạo khảo sát" --> HT
    HT -- "Danh sách yêu cầu<br/>hỗ trợ chưa xử lý" --> NVCS

    ADMIN -- "Tạo/khóa tài khoản,<br/>phân quyền" --> HT
    HT -- "Báo cáo tổng hợp,<br/>nhật ký hệ thống" --> ADMIN

    HT -- "Yêu cầu vận chuyển" --> DVVC
    DVVC -- "Cập nhật tracking" --> HT
```

## 5. Sơ đồ luồng dữ liệu mức đỉnh

```mermaid
graph TD
    KH((Khách hàng))
    NV((Nhân viên))
    ADMIN((Quản trị viên))

    P1["1.0<br/>Quản lý tài khoản<br/>& phân quyền"]
    P2["2.0<br/>Quản lý sản phẩm<br/>& tồn kho"]
    P3["3.0<br/>Xử lý đơn hàng<br/>& thanh toán"]
    P4["4.0<br/>Marketing<br/>& khuyến mãi"]
    P5["5.0<br/>CRM & chăm sóc<br/>khách hàng"]

    D1[(User / Employee / Role)]
    D2[(Product / ProductVariant<br/>/ InventoryStock)]
    D3[(Order / Payment /<br/>Shipment)]
    D4[(Voucher / FlashSale /<br/>LoyaltyPoint)]
    D5[(CustomerProfileCRM /<br/>Survey / Conversation)]

    KH -- "Thông tin đăng ký" --> P1
    P1 <--> D1
    ADMIN -- "Tạo/khóa tài khoản" --> P1
    NV -- "Thông tin nhân viên" --> P1

    NV -- "Cập nhật sản phẩm/kho" --> P2
    P2 <--> D2
    P2 -- "Thông tin sản phẩm" --> KH

    KH -- "Đặt hàng, thanh toán" --> P3
    P3 <--> D3
    P3 -- "Yêu cầu kiểm tra tồn kho" --> P2
    P2 -- "Tồn kho khả dụng / báo hết hàng" --> P3
    P3 -- "Xác nhận đơn" --> KH

    NV -- "Tạo voucher/flash sale" --> P4
    P4 <--> D4
    P4 -- "Ưu đãi áp dụng" --> P3
    P4 -- "Thông báo khuyến mãi" --> KH

    P3 -- "Dữ liệu đơn hàng hoàn tất" --> P5
    KH -- "Phản hồi, trả lời khảo sát" --> P5
    P5 <--> D5
    NV -- "Xử lý ticket, tạo khảo sát" --> P5
    P5 -- "Thông báo, kết quả khảo sát" --> KH
```

## 6. Sơ đồ trạng thái (vòng đời entity)

Order và User đều có quy tắc chuyển trạng thái một chiều (không quay ngược tuỳ ý) — quy tắc này chưa thể hiện được trong class diagram (chỉ là 1 field `status: String`), nên tách riêng thành state diagram.

**Order.status**

```mermaid
stateDiagram-v2
    [*] --> pending: Tạo đơn
    pending --> confirmed: Thanh toán online thành công / Xác nhận COD
    pending --> cancelled: Huỷ trước xác nhận
    confirmed --> shipping: Nhân viên kho tạo vận đơn
    confirmed --> cancelled: Huỷ trước khi giao
    shipping --> delivered: Giao thành công
    delivered --> [*]
    cancelled --> [*]
```

**User.status**

```mermaid
stateDiagram-v2
    [*] --> active: Đăng ký / Admin tạo tài khoản
    active --> locked: Admin khoá
    locked --> active: Admin mở khoá
    active --> deleted: Xoá mềm
    locked --> deleted: Xoá mềm
    deleted --> [*]
```

> Lưu ý: `deleted` là trạng thái cuối, không có chiều quay lại — đúng nguyên tắc xoá mềm (giữ dữ liệu, chỉ ẩn tài khoản).

## 7. Luồng người dùng — Khách hàng mua hàng (end-to-end)

```mermaid
sequenceDiagram
    actor KH as Khách hàng
    participant FE as Web / Mobile App
    participant BE as Backend API
    participant DB as CSDL
    actor NVK as Nhân viên Kho vận

    KH->>FE: Duyệt danh mục / tìm kiếm (theo nền tảng, loại sản phẩm)
    FE->>BE: GET /products?filter=...
    BE->>DB: Truy vấn Product, ProductVariant, InventoryStock
    DB-->>BE: Danh sách sản phẩm còn hàng
    BE-->>FE: Trả kết quả
    FE-->>KH: Hiển thị lưới sản phẩm

    KH->>FE: Thêm vào giỏ hàng
    FE->>BE: POST /cart-items
    BE->>DB: Ghi CartItem

    KH->>FE: Checkout (chọn địa chỉ, phương thức thanh toán)
    FE->>BE: POST /orders
    BE->>DB: Kiểm tra InventoryStock khả dụng

    alt Hết hàng
        DB-->>BE: Không đủ tồn kho
        BE-->>FE: Báo lỗi hết hàng
        FE-->>KH: Yêu cầu chọn lại sản phẩm/số lượng
    else Còn hàng
        BE->>DB: Tạo Order + OrderItem (snapshot giá)
        BE->>DB: Trừ InventoryStock, ghi InventoryMovement
        BE->>DB: Ghi OrderStatusHistory (pending)

        alt Thanh toán online (ví / chuyển khoản)
            KH->>FE: Thanh toán
            FE->>BE: POST /payments
            BE->>DB: Ghi Payment, cập nhật OrderStatusHistory (confirmed)
        else Thanh toán COD
            BE->>DB: Cập nhật OrderStatusHistory (confirmed) — thu tiền khi giao
        end
        BE-->>FE: Xác nhận đơn hàng

        NVK->>BE: Xác nhận đóng gói
        BE->>DB: Tạo Shipment, cập nhật OrderStatusHistory (shipping)
        Note over NVK,DB: Đơn vị vận chuyển cập nhật tracking (xem sơ đồ ngữ cảnh)
        BE->>DB: Cập nhật OrderStatusHistory (delivered)

        opt Thanh toán COD
            NVK->>BE: Xác nhận đã thu tiền khi giao
            BE->>DB: Ghi Payment (method=cod, status=paid)
        end

        BE->>KH: Notification cập nhật trạng thái đơn
        KH->>FE: Đơn đã giao → Đánh giá sản phẩm
        FE->>BE: POST /reviews
        BE->>DB: Ghi Review
    end
```

## 8. Luồng Đổi trả & Hoàn tiền

```mermaid
sequenceDiagram
    actor KH as Khách hàng
    participant FE as Web / Mobile App
    participant BE as Backend API
    participant DB as CSDL
    actor NVCS as Nhân viên CSKH

    KH->>FE: Yêu cầu đổi trả 1 OrderItem (kèm lý do)
    FE->>BE: POST /refund-returns
    BE->>DB: Tạo RefundReturn (status=requested)
    BE->>NVCS: Thông báo yêu cầu đổi trả mới

    NVCS->>BE: Xem xét yêu cầu
    alt Duyệt yêu cầu
        NVCS->>BE: Duyệt (approved)
        BE->>DB: Cập nhật RefundReturn (status=approved)
        BE->>DB: Tạo WalletTransaction hoàn tiền, cộng số dư Wallet
        BE->>DB: Cập nhật RefundReturn (status=refunded)
        BE->>KH: Notification hoàn tiền thành công
    else Từ chối
        NVCS->>BE: Từ chối (rejected), kèm lý do
        BE->>DB: Cập nhật RefundReturn (status=rejected)
        BE->>KH: Notification yêu cầu bị từ chối
    end
```

## 9. Luồng Khảo sát khách hàng (Survey)

```mermaid
sequenceDiagram
    actor NVCS as Nhân viên CSKH
    participant AD as Trang Admin
    participant BE as Backend API
    participant DB as CSDL
    actor KH as Khách hàng
    participant FE as Web / Mobile App

    NVCS->>AD: Tạo Survey + danh sách câu hỏi
    AD->>BE: POST /surveys, /surveys/{id}/questions
    BE->>DB: Ghi Survey, SurveyQuestion

    NVCS->>AD: Chọn CustomerSegment & gửi khảo sát
    AD->>BE: POST /campaigns (gắn Survey)
    BE->>DB: Ghi Campaign, CampaignTarget
    BE->>DB: Sinh Notification cho từng khách trong segment
    BE->>KH: Notification "Bạn có 1 khảo sát mới"

    KH->>FE: Mở khảo sát, trả lời từng câu
    FE->>BE: POST /surveys/{id}/responses
    BE->>DB: Ghi SurveyResponse + SurveyAnswer

    NVCS->>AD: Xem thống kê kết quả
    AD->>BE: GET /surveys/{id}/stats
    BE->>DB: Tổng hợp SurveyAnswer theo từng câu hỏi
    BE-->>AD: Trả biểu đồ thống kê
```

## 10. Luồng nhân viên / quản trị (theo phòng ban)

```mermaid
sequenceDiagram
    actor NV as Nhân viên
    participant AD as Trang Admin
    participant BE as Backend API
    participant DB as CSDL

    NV->>AD: Đăng nhập
    AD->>BE: POST /auth/login
    BE-->>AD: Token + quyền theo department

    alt department = sales
        NV->>AD: Quản lý sản phẩm / giá / khuyến mãi
        AD->>BE: CRUD /products, /vouchers, /flash-sales
    else department = warehouse
        NV->>AD: Cập nhật tồn kho, xác nhận đóng gói
        AD->>BE: PATCH /inventory, POST /shipments
    else department = cs
        NV->>AD: Xử lý hội thoại, duyệt đổi trả, tạo khảo sát
        AD->>BE: PATCH /conversations, /refund-returns, POST /surveys
    else department = admin
        NV->>AD: Quản lý tài khoản khách hàng, phân quyền nhân viên
        AD->>BE: PATCH /customers/{id}, POST /employees
    end

    BE->>DB: Ghi thay đổi tương ứng vào bảng của đúng domain
```

## 11. Kiến trúc kỹ thuật

```mermaid
graph LR
    WEB["Web App<br/>(React + Vite)"]
    APP["Mobile App<br/>(Flutter)"]
    API["Backend API<br/>(Spring Boot + JPA)"]
    DB[("PostgreSQL<br/>45 bảng / 5 domain")]

    WEB -->|REST API| API
    APP -->|REST API| API
    API -->|JPA/Hibernate| DB
```

- **Backend**: Java Spring Boot, JPA/Hibernate, migration bằng Flyway.
- **Web**: React + Vite + React Router, không dùng UI framework ngoài — tự xây token màu/spacing riêng.
- **Mobile**: Flutter, dùng chung mô hình dữ liệu với web (đối chiếu qua `crm-ecommerce-class-diagram.md`).
- **CSDL**: PostgreSQL, container hoá bằng Docker Compose, có script backup/restore (`scripts/backup-db.sh`, `scripts/restore-db.sh`).

## 12. Trạng thái hiện tại (để nhóm đối chiếu trước khi chốt phương án)

| Phần | Trạng thái |
|---|---|
| Class diagram + migration CSDL (45 bảng) | ✅ Hoàn thành, đã verify chạy thật |
| Web — giao diện khách hàng (trang chủ, danh mục, tìm kiếm, giỏ hàng, đăng nhập) | ✅ Hoàn thành (dữ liệu mẫu, chưa nối API thật) |
| Web — giao diện Admin (sản phẩm, kho, đơn hàng, marketing, khách hàng, báo cáo, nhân viên) | ✅ Hoàn thành (dữ liệu mẫu, chưa nối API thật) |
| Mobile app — các màn hình chính | ✅ Hoàn thành (dữ liệu mẫu) |
| Backend API thật (Entity/Repository/Controller) | ❌ Chưa làm — mới có bộ khung project + `/health` |
| Kết nối Web/Mobile ↔ Backend thật | ❌ Chưa làm |
| Test tự động (unit/e2e) cho backend | ❌ Chưa làm |

**Việc cần bàn để chốt phương án**: thứ tự triển khai backend thật theo domain nào trước (đề xuất ban đầu: A→B→C→D→E theo đúng thứ tự phụ thuộc), có giữ nguyên phân công theo 5 domain hay không, và mốc thời gian cho từng domain.
