import { apiFetch } from './api'

/** GET /orders/{id}/invoice — see backend InvoiceResponse. */
export interface Invoice {
  id: string
  invoiceNo: string
  orderId: string
  status: 'issued' | 'cancelled'
  buyerName: string
  buyerCompany: string | null
  buyerTaxCode: string | null
  buyerAddress: string | null
  buyerEmail: string | null
  buyerPhone: string | null
  paymentMethod: string | null
  goodsAmount: number
  discountAmount: number
  shippingFeeAmount: number
  totalAmount: number
  vatRate: number
  preTaxAmount: number
  vatAmount: number
  issuedAt: string
  cancelledAt: string | null
  cancelReason: string | null
  replacesInvoiceId: string | null
  lines: { productName: string; attributes: string | null; quantity: number; unitPrice: number; lineTotal: number }[]
}

export interface OrderInvoices {
  current: Invoice | null
  cancelled: Invoice[]
}

export interface ReissueInvoice {
  buyerName: string
  buyerCompany: string
  buyerTaxCode: string
  buyerAddress: string
  buyerEmail: string
  reason: string
}

export const fetchOrderInvoices = (token: string | null, orderId: string) =>
  apiFetch<OrderInvoices>(`/orders/${orderId}/invoice`, {}, token)

export const reissueInvoice = (token: string | null, orderId: string, body: ReissueInvoice) =>
  apiFetch<Invoice>(`/orders/${orderId}/invoice/reissue`, { method: 'POST', body: JSON.stringify(body) }, token)

export const invoiceDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
