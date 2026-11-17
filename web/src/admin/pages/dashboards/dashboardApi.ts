import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../../lib/api'
import { useAuth } from '../../../state/AuthContext'
import { isoDay } from '../../reports'

export interface SalesMonth {
  month: string
  gmv: number
  netProduct: number
  collected: number
  orders: number
  aov: number
}

export interface SalesReport {
  from: string
  to: string
  gmv: number
  netProduct: number
  collected: number
  refundedAmount: number
  refundCount: number
  orders: number
  aov: number
  deliveredOrders: number
  refundedOrders: number
  refundRatePct: number | null
  priorNetProduct: number
  yoyPct: number | null
  months: SalesMonth[]
  byProductType: { productType: string; merchandise: number; orders: number; aov: number }[]
  payments: { method: string; status: string; count: number; amount: number }[]
  refundReasons: { kind: string; reason: string; count: number; amount: number }[]
  stages: { fromStatus: string; toStatus: string; avgHours: number | null; orders: number }[]
}

export interface MarketingReport {
  from: string
  to: string
  withPromotion: { orders: number; revenue: number }
  withoutPromotion: { orders: number; revenue: number }
  promotionDiscount: number
  discountPerPromoOrder: number | null
  mechanisms: { key: string; label: string; orders: number; revenue: number; discount: number }[]
  flashSales: { programName: string; productName: string; sku: string; soldQty: number; limitQty: number | null; soldPct: number | null; flashPrice: number }[]
  tiers: { tier: string; orders: number; revenue: number; discount: number }[]
  vouchers: { code: string; uses: number; orders: number }[]
  campaigns: {
    id: string
    name: string
    windowFrom: string
    windowTo: string
    assumedEnd: boolean
    targeted: number
    sent: number
    opened: number
    converted: number
    openRatePct: number | null
    buyRatePct: number | null
    revenue: number
  }[]
}

export interface BehaviorReport {
  from: string
  to: string
  orders: number
  crossCategoryOrders: number
  crossCategoryRatePct: number | null
  crossTypeOrders: number
  crossTypeRatePct: number | null
  repeatPurchases: number
  avgIntervalDays: number | null
  medianIntervalDays: number | null
  intervals: {
    key: string
    label: string
    count: number
    segments: { segment: string; count: number; percent: number | null }[]
  }[]
}

export interface TreeNode {
  id: string
  label: string
  orders: number
  sharePct: number | null
}

export interface BehaviorTree {
  level: string
  label: string
  orders: number
  companionLabel: string | null
  children: TreeNode[]
  companions: TreeNode[]
}

export const DASHBOARD_SEGMENTS = ['champions', 'loyal', 'potential', 'at_risk', 'lost', 'new', 'other', 'unknown'] as const
export const DASHBOARD_PRODUCT_TYPES = ['game_disc', 'controller', 'accessory'] as const

export function defaultRange() {
  const to = new Date()
  const from = new Date(to.getTime() - 89 * 86_400_000)
  return { from: isoDay(from), to: isoDay(to) }
}

function sameSet(selected: string[], all: readonly string[]) {
  return selected.length === all.length && all.every((id) => selected.includes(id))
}

/** Bỏ param khi đang chọn đủ. Không chọn mục nào thì gửi `__none__` để API trả về rỗng. */
export function appendDashboardFilters(params: URLSearchParams, segments: string[], productTypes: string[]) {
  if (!sameSet(segments, DASHBOARD_SEGMENTS)) {
    if (segments.length === 0) params.append('segments', '__none__')
    else for (const value of segments) params.append('segments', value)
  }
  if (!sameSet(productTypes, DASHBOARD_PRODUCT_TYPES)) {
    if (productTypes.length === 0) params.append('productTypes', '__none__')
    else for (const value of productTypes) params.append('productTypes', value)
  }
}

export function useReport<T>(path: string) {
  const { token } = useAuth()
  const initial = defaultRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [segments, setSegments] = useState<string[]>([...DASHBOARD_SEGMENTS])
  const [productTypes, setProductTypes] = useState<string[]>([...DASHBOARD_PRODUCT_TYPES])
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => {
    const params = new URLSearchParams({ from, to })
    appendDashboardFilters(params, segments, productTypes)
    return params.toString()
  }, [from, to, segments, productTypes])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    apiFetch<T>(`${path}?${query}`, {}, token)
      .then((report) => {
        if (!cancelled) {
          setData(report)
          setError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token, path, query])

  const setRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom)
    setTo(nextTo)
  }

  return { from, to, setFrom, setTo, setRange, segments, setSegments, productTypes, setProductTypes, query, data, error, loading }
}
