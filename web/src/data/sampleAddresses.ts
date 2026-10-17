// Sample/mock shipping addresses for the checkout demo. Mirrors the
// Address entity fields in crm-ecommerce-class-diagram.md (domain A):
// recipientName, phone, fullAddress, isDefault.
export interface Address {
  id: string
  recipientName: string
  phone: string
  fullAddress: string
  isDefault: boolean
}

export const SAMPLE_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    recipientName: 'Nguyễn Văn An',
    phone: '090 123 4567',
    fullAddress: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    isDefault: true,
  },
  {
    id: 'addr-2',
    recipientName: 'Nguyễn Văn An',
    phone: '090 123 4567',
    fullAddress: '45 Lê Lợi, Phường 6, Quận 3, TP.HCM',
    isDefault: false,
  },
]

export type PaymentMethod = 'cod' | 'bank_transfer' | 'wallet'

export const PAYMENT_METHODS: { id: PaymentMethod; title: string; desc: string }[] = [
  { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', desc: 'Trả tiền mặt cho shipper khi giao đến' },
  { id: 'bank_transfer', title: 'Chuyển khoản ngân hàng', desc: 'Quét mã QR hoặc chuyển khoản trực tiếp' },
  { id: 'wallet', title: 'Ví Chợ Tốt Mua', desc: 'Số dư khả dụng: ₫250.000' },
]
