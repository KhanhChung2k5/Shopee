import { ALL_PRODUCTS, calculateVoucherBundleDiscount, VOUCHERS, type Product } from '../data/sampleProducts'

/**
 * Temporary integration seam for P3 development only.
 *
 * P1/P2/P4/P5 are simulated here so the P3 order flow can be tested before
 * those modules are merged. Keep fake behavior here; do not copy it into
 * production pages or backend services. See docs/p3-demo-mode.md.
 */
const MODE_KEY = 'chotomua_p3_demo_mode'
const STATE_KEY = 'chotomua_p3_demo_state_v1'
const AUTH_KEY = 'chotomua_auth'
const DEMO_BUYER_ID = '10000000-0000-4000-8000-000000000001'
const DEMO_EMPLOYEE_ID = '10000000-0000-4000-8000-000000000002'
const DEMO_ADDRESS_ID = '20000000-0000-4000-8000-000000000001'

type OrderStatus = 'pending' | 'confirmed' | 'cancel_requested' | 'shipping' | 'delivered' | 'cancelled'

interface DemoProfile {
  id: string
  email: string
  phone: string | null
  fullName: string | null
  avatarUrl: string | null
  gender: string | null
  dob: string | null
  role: string
}

interface DemoAddress {
  id: string
  recipientName: string
  phone: string
  fullAddress: string
  isDefault: boolean
}

interface DemoCartItem {
  id: string
  variantId: string
  quantity: number
  isSelected: boolean
  updatedAt: string
}

interface DemoOrderItem {
  id: string
  variantId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  productNameSnapshot: string
  variantAttributesSnapshot: string | null
}

interface DemoStatusHistory {
  id: string
  status: OrderStatus
  changedBy: string
  changedByType: 'buyer' | 'employee'
  reason: string | null
  changedAt: string
}

interface DemoOrder {
  id: string
  addressId: string
  shippingAddressSnapshot: string
  subtotalAmount: number
  discountAmount: number
  shippingFeeAmount: number
  totalAmount: number
  status: OrderStatus
  warehouseId: string | null
  shippingProviderName: string | null
  trackingNo: string | null
  shipmentStatus: string
  createdAt: string
  items: DemoOrderItem[]
  statusHistory: DemoStatusHistory[]
}

interface DemoState {
  profile: DemoProfile
  addresses: DemoAddress[]
  cartItems: DemoCartItem[]
  orders: DemoOrder[]
}

export class P3DemoError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function isP3DemoMode() {
  if (!storageAvailable()) return false
  const flag = new URLSearchParams(window.location.search).get('p3-demo')
  if (flag === '1') window.localStorage.setItem(MODE_KEY, '1')
  if (flag === '0') window.localStorage.removeItem(MODE_KEY)
  return window.localStorage.getItem(MODE_KEY) === '1'
}

export function disableP3DemoMode() {
  if (storageAvailable()) window.localStorage.removeItem(MODE_KEY)
}

export function resetP3DemoData() {
  if (!storageAvailable()) return
  window.localStorage.removeItem(STATE_KEY)
  window.localStorage.removeItem(AUTH_KEY)
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `30000000-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)}`
}

function initialState(): DemoState {
  return {
    profile: {
      id: DEMO_BUYER_ID,
      email: 'p3.demo@chotomua.local',
      phone: '0901234567',
      fullName: 'Khách hàng P3 Demo',
      avatarUrl: null,
      gender: null,
      dob: null,
      role: 'buyer',
    },
    addresses: [{
      id: DEMO_ADDRESS_ID,
      recipientName: 'Khách hàng P3 Demo',
      phone: '0901234567',
      fullAddress: '01 Đường Demo, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      isDefault: true,
    }],
    cartItems: [],
    orders: [],
  }
}

function migrateDemoState(state: DemoState) {
  for (const order of state.orders) {
    const latestChange = order.statusHistory.at(-1)
    const wasCancelledDirectlyByBuyer = order.status === 'cancelled'
      && latestChange?.status === 'cancelled'
      && latestChange.changedByType === 'buyer'

    if (wasCancelledDirectlyByBuyer) {
      order.status = 'cancel_requested'
      latestChange.status = 'cancel_requested'
    }
  }
  return state
}

function readState(): DemoState {
  if (!storageAvailable()) return initialState()
  try {
    const raw = window.localStorage.getItem(STATE_KEY)
    if (raw) {
      const state = migrateDemoState(JSON.parse(raw) as DemoState)
      writeState(state)
      return state
    }
  } catch {
    // A corrupt demo payload is safe to replace because it is fake data.
  }
  const state = initialState()
  writeState(state)
  return state
}

function writeState(state: DemoState) {
  if (storageAvailable()) window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

function productVariantId(index: number) {
  return `30000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, '0')}`
}

export function demoVariantIdForProduct(productId: string) {
  const index = ALL_PRODUCTS.findIndex((product) => product.id === productId)
  return index >= 0 ? productVariantId(index) : null
}

function productForVariant(variantId: string): Product | undefined {
  const index = ALL_PRODUCTS.findIndex((_, productIndex) => productVariantId(productIndex) === variantId)
  return index >= 0 ? ALL_PRODUCTS[index] : undefined
}

// P3-DEMO-INTEGRATION-SEAM: deterministic fake stock until P2 exposes
// availableQuantity from Inventory. Real requests receive this from Cart API.
function demoAvailableQuantity(variantId: string) {
  const index = ALL_PRODUCTS.findIndex((_, productIndex) => productVariantId(productIndex) === variantId)
  return index < 0 ? 0 : 5 + (index % 8)
}

function parseBody(options: RequestInit): Record<string, unknown> {
  if (typeof options.body !== 'string' || options.body.length === 0) return {}
  try {
    return JSON.parse(options.body) as Record<string, unknown>
  } catch {
    throw new P3DemoError(400, 'Dữ liệu gửi lên không hợp lệ')
  }
}

function cartResponse(item: DemoCartItem) {
  const product = productForVariant(item.variantId)
  return {
    ...item,
    productName: product?.name ?? null,
    productType: product?.productType ?? null,
    imageUrl: product?.imageUrl ?? null,
    unitPrice: product?.price ?? null,
    attributesJson: product ? JSON.stringify({ nềnTảng: product.platforms?.join(', ') ?? 'PS5' }) : null,
    available: Boolean(product) && demoAvailableQuantity(item.variantId) > 0,
    availableQuantity: demoAvailableQuantity(item.variantId),
  }
}

function orderSummary(order: DemoOrder) {
  return {
    id: order.id,
    totalAmount: order.totalAmount,
    status: order.status,
    shipmentStatus: order.shipmentStatus,
    itemCount: order.items.length,
    createdAt: order.createdAt,
  }
}

function orderResponse(order: DemoOrder) {
  return {
    ...order,
    // P3-DEMO-INTEGRATION-SEAM: P2 will eventually provide the product image.
    // Hydrate it at response time so previously created demo orders also gain
    // thumbnails without rewriting localStorage or changing the Order schema.
    items: order.items.map((item) => ({
      ...item,
      imageUrl: productForVariant(item.variantId)?.imageUrl ?? null,
    })),
  }
}

function requireItem<T>(item: T | undefined, message: string): T {
  if (!item) throw new P3DemoError(404, message)
  return item
}

function setDefaultAddress(addresses: DemoAddress[], selected: DemoAddress) {
  if (!selected.isDefault) return addresses
  return addresses.map((address) => ({ ...address, isDefault: address.id === selected.id }))
}

function statusChange(status: OrderStatus, changedByType: 'buyer' | 'employee', reason: string | null): DemoStatusHistory {
  return {
    id: createId(),
    status,
    changedBy: changedByType === 'buyer' ? DEMO_BUYER_ID : DEMO_EMPLOYEE_ID,
    changedByType,
    reason,
    changedAt: new Date().toISOString(),
  }
}

function response<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), 120))
}

/** Fake fetch matching only endpoints consumed by the P3 screens. */
export async function p3DemoFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const url = new URL(path, 'http://p3-demo.local')
  const pathname = url.pathname
  const body = parseBody(options)
  const state = readState()

  if (pathname === '/auth/login' && method === 'POST') {
    return response({ token: 'p3-demo-token', userId: DEMO_BUYER_ID, role: 'buyer', fullName: state.profile.fullName, department: null } as T)
  }
  if (pathname === '/auth/register' && method === 'POST') {
    state.profile.fullName = String(body.fullName ?? state.profile.fullName)
    state.profile.email = String(body.email ?? state.profile.email)
    writeState(state)
    return response({ token: 'p3-demo-token', userId: DEMO_BUYER_ID, role: 'buyer', fullName: state.profile.fullName, department: null } as T)
  }
  if (pathname === '/users/me' && method === 'GET') return response(state.profile as T)
  if (pathname === '/users/me' && method === 'PATCH') {
    state.profile = { ...state.profile, ...body, id: DEMO_BUYER_ID, role: 'buyer' } as DemoProfile
    writeState(state)
    return response(state.profile as T)
  }

  if (pathname === '/addresses' && method === 'GET') return response(state.addresses as T)
  if (pathname === '/addresses' && method === 'POST') {
    const address: DemoAddress = {
      id: createId(),
      recipientName: String(body.recipientName ?? ''),
      phone: String(body.phone ?? ''),
      fullAddress: String(body.fullAddress ?? ''),
      isDefault: Boolean(body.isDefault) || state.addresses.length === 0,
    }
    state.addresses.push(address)
    state.addresses = setDefaultAddress(state.addresses, address)
    writeState(state)
    return response(address as T)
  }
  const addressMatch = pathname.match(/^\/addresses\/([^/]+)$/)
  if (addressMatch && method === 'PUT') {
    const index = state.addresses.findIndex((address) => address.id === addressMatch[1])
    requireItem(state.addresses[index], 'Không tìm thấy địa chỉ')
    const address = { ...state.addresses[index], ...body, id: addressMatch[1] } as DemoAddress
    state.addresses[index] = address
    state.addresses = setDefaultAddress(state.addresses, address)
    writeState(state)
    return response(address as T)
  }
  if (addressMatch && method === 'DELETE') {
    const before = state.addresses.length
    state.addresses = state.addresses.filter((address) => address.id !== addressMatch[1])
    if (state.addresses.length === before) throw new P3DemoError(404, 'Không tìm thấy địa chỉ')
    if (state.addresses.length > 0 && !state.addresses.some((address) => address.isDefault)) state.addresses[0].isDefault = true
    writeState(state)
    return response(null as T)
  }

  if (pathname === '/cart-items' && method === 'GET') return response(state.cartItems.map(cartResponse) as T)
  if (pathname === '/cart-items' && method === 'POST') {
    const variantId = String(body.variantId ?? '')
    requireItem(productForVariant(variantId), 'Sản phẩm demo không tồn tại')
    const quantity = Math.max(1, Number(body.quantity ?? 1))
    let item = state.cartItems.find((entry) => entry.variantId === variantId)
    const nextQuantity = item ? item.quantity + quantity : quantity
    const availableQuantity = demoAvailableQuantity(variantId)
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity > availableQuantity) {
      throw new P3DemoError(400, `Kho chỉ còn ${availableQuantity} sản phẩm`)
    }
    if (item) item.quantity = nextQuantity
    else {
      item = { id: createId(), variantId, quantity, isSelected: true, updatedAt: new Date().toISOString() }
      state.cartItems.push(item)
    }
    item.updatedAt = new Date().toISOString()
    writeState(state)
    return response(cartResponse(item) as T)
  }
  const cartSelectionMatch = pathname.match(/^\/cart-items\/([^/]+)\/selection$/)
  if (cartSelectionMatch && method === 'PATCH') {
    const item = requireItem(state.cartItems.find((entry) => entry.id === cartSelectionMatch[1]), 'Không tìm thấy sản phẩm trong giỏ')
    item.isSelected = Boolean(body.isSelected)
    item.updatedAt = new Date().toISOString()
    writeState(state)
    return response(cartResponse(item) as T)
  }
  const cartMatch = pathname.match(/^\/cart-items\/([^/]+)$/)
  if (cartMatch && method === 'PATCH') {
    const item = requireItem(state.cartItems.find((entry) => entry.id === cartMatch[1]), 'Không tìm thấy sản phẩm trong giỏ')
    const quantity = Math.max(1, Number(body.quantity ?? item.quantity))
    const availableQuantity = demoAvailableQuantity(item.variantId)
    if (!Number.isSafeInteger(quantity) || quantity > availableQuantity) {
      throw new P3DemoError(400, `Kho chỉ còn ${availableQuantity} sản phẩm`)
    }
    item.quantity = quantity
    item.updatedAt = new Date().toISOString()
    writeState(state)
    return response(cartResponse(item) as T)
  }
  if (cartMatch && method === 'DELETE') {
    state.cartItems = state.cartItems.filter((entry) => entry.id !== cartMatch[1])
    writeState(state)
    return response(null as T)
  }

  if (pathname === '/orders' && method === 'POST') {
    const address = requireItem(state.addresses.find((entry) => entry.id === body.addressId), 'Vui lòng chọn địa chỉ giao hàng')
    const selected = state.cartItems.filter((item) => item.isSelected)
    if (selected.length === 0) throw new P3DemoError(400, 'Giỏ hàng chưa có sản phẩm được chọn')
    const overStockItem = selected.find((item) => item.quantity > demoAvailableQuantity(item.variantId))
    if (overStockItem) throw new P3DemoError(400, `Kho chỉ còn ${demoAvailableQuantity(overStockItem.variantId)} sản phẩm`)
    const items: DemoOrderItem[] = selected.map((cartItem) => {
      const product = requireItem(productForVariant(cartItem.variantId), 'Sản phẩm không còn khả dụng')
      return {
        id: createId(),
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
        unitPrice: product.price,
        lineTotal: product.price * cartItem.quantity,
        productNameSnapshot: product.name,
        variantAttributesSnapshot: JSON.stringify({ nềnTảng: product.platforms?.join(', ') ?? 'PS5' }),
      }
    })
    const subtotalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const voucherIds = Array.isArray(body.voucherIds)
      ? body.voucherIds.filter((entry): entry is string => typeof entry === 'string')
      : typeof body.voucherId === 'string' ? [body.voucherId] : []
    const vouchers = voucherIds.map((voucherId) => requireItem(VOUCHERS.find((entry) => entry.id === voucherId), 'Voucher không tồn tại'))
    const productVoucherCount = vouchers.filter((voucher) => voucher.discountType !== 'shipping').length
    const shippingVoucherCount = vouchers.filter((voucher) => voucher.discountType === 'shipping').length
    if (new Set(voucherIds).size !== voucherIds.length || productVoucherCount > 1 || shippingVoucherCount > 1) {
      throw new P3DemoError(400, 'Chỉ được dùng một voucher giảm giá và một voucher vận chuyển')
    }
    if (vouchers.some((voucher) => subtotalAmount < voucher.minOrderValue)) {
      throw new P3DemoError(400, 'Đơn hàng chưa đạt giá trị tối thiểu của voucher')
    }
    const shippingFeeAmount = 30_000
    const discountAmount = calculateVoucherBundleDiscount(vouchers, subtotalAmount, shippingFeeAmount)
    const order: DemoOrder = {
      id: createId(),
      addressId: address.id,
      shippingAddressSnapshot: `${address.recipientName} · ${address.phone} · ${address.fullAddress}`,
      subtotalAmount,
      discountAmount,
      shippingFeeAmount,
      totalAmount: Math.max(0, subtotalAmount + shippingFeeAmount - discountAmount),
      status: 'pending',
      warehouseId: null,
      shippingProviderName: null,
      trackingNo: null,
      shipmentStatus: 'pending',
      createdAt: new Date().toISOString(),
      items,
      statusHistory: [statusChange('pending', 'buyer', 'Đơn hàng được tạo trong P3 Demo')],
    }
    state.orders.unshift(order)
    const selectedIds = new Set(selected.map((item) => item.id))
    state.cartItems = state.cartItems.filter((item) => !selectedIds.has(item.id))
    writeState(state)
    return response(orderResponse(order) as T)
  }
  if (pathname === '/orders' && method === 'GET') {
    const status = url.searchParams.get('status')
    const orders = status ? state.orders.filter((order) => order.status === status) : state.orders
    return response(orders.map(orderSummary) as T)
  }

  // Demo-only: stands in for P2/P5 staff actions. Never make this a real
  // customer endpoint when integrating production APIs.
  const advanceMatch = pathname.match(/^\/demo\/orders\/([^/]+)\/advance$/)
  if (advanceMatch && method === 'PATCH') {
    const order = requireItem(state.orders.find((entry) => entry.id === advanceMatch[1]), 'Không tìm thấy đơn hàng')
    const next: Partial<Record<OrderStatus, OrderStatus>> = {
      pending: 'confirmed',
      confirmed: 'shipping',
      cancel_requested: 'cancelled',
      shipping: 'delivered',
    }
    const nextStatus = next[order.status]
    if (!nextStatus) throw new P3DemoError(409, 'Đơn hàng đã ở trạng thái cuối')
    order.status = nextStatus
    if (nextStatus === 'confirmed') order.shipmentStatus = 'packed'
    if (nextStatus === 'shipping') {
      order.warehouseId = '40000000-0000-4000-8000-000000000001'
      order.shippingProviderName = 'Giao Hàng Demo'
      order.trackingNo = `P3${order.id.replaceAll('-', '').slice(0, 10).toUpperCase()}`
      order.shipmentStatus = 'shipping'
    }
    if (nextStatus === 'delivered') order.shipmentStatus = 'delivered'
    const reason = nextStatus === 'cancelled'
      ? 'Nhân viên xác nhận yêu cầu huỷ của khách hàng'
      : `Mô phỏng nghiệp vụ ${nextStatus} từ P2/P5`
    order.statusHistory.push(statusChange(nextStatus, 'employee', reason))
    writeState(state)
    return response(orderResponse(order) as T)
  }

  const orderStatusMatch = pathname.match(/^\/orders\/([^/]+)\/status$/)
  if (orderStatusMatch && method === 'PATCH') {
    const order = requireItem(state.orders.find((entry) => entry.id === orderStatusMatch[1]), 'Không tìm thấy đơn hàng')
    if (body.status !== 'cancel_requested') throw new P3DemoError(403, 'Khách hàng chỉ có thể gửi yêu cầu huỷ đơn')
    if (order.status !== 'pending' && order.status !== 'confirmed') throw new P3DemoError(409, 'Không thể yêu cầu huỷ đơn ở trạng thái hiện tại')
    const previousStatus = order.status
    order.status = 'cancel_requested'
    const change = statusChange('cancel_requested', 'buyer', String(body.reason ?? 'Khách hàng yêu cầu huỷ đơn'))
    order.statusHistory.push(change)
    writeState(state)
    return response({ orderId: order.id, previousStatus, status: order.status, change } as T)
  }
  const orderMatch = pathname.match(/^\/orders\/([^/]+)$/)
  if (orderMatch && method === 'GET') {
    const order = requireItem(state.orders.find((entry) => entry.id === orderMatch[1]), 'Không tìm thấy đơn hàng')
    return response(orderResponse(order) as T)
  }

  throw new P3DemoError(501, `P3 Demo chưa giả lập ${method} ${pathname}`)
}
