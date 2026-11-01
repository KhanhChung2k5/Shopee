/** Shapes of /api/reports/* (backend modules/report) and the CSV export used by the report page. */

export interface RevenueDay {
  day: string
  orders: number
  revenue: number
  refunds: number
  netRevenue: number
  cogs: number
  grossProfit: number
  uncostedUnits: number
}

export interface RevenueProduct {
  variantId: string
  sku: string
  name: string
  productType: string
  units: number
  revenue: number
  cogs: number | null
  grossProfit: number | null
  marginPct: number | null
}

export interface RevenueReport {
  from: string
  to: string
  orders: number
  revenue: number
  refunds: number
  netRevenue: number
  cogs: number
  grossProfit: number
  marginPct: number | null
  uncostedUnits: number
  days: RevenueDay[]
  topProducts: RevenueProduct[]
}

export interface InventoryLine {
  variantId: string
  sku: string
  name: string
  opening: number
  imported: number
  returned: number
  exported: number
  adjusted: number
  closing: number
  availableNow: number
  unitCost: number | null
  closingValue: number | null
  lowStock: boolean
}

export interface InventoryReport {
  from: string
  to: string
  warehouseId: string | null
  lowStockThreshold: number
  variants: number
  lowStockVariants: number
  closingValue: number
  uncostedVariants: number
  lines: InventoryLine[]
}

/** yyyy-MM-dd in local (Vietnam) time — what the report API expects. */
export function isoDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Download rows as a UTF-8 CSV (with BOM, so Excel keeps the Vietnamese text intact). */
export function downloadCsv(fileName: string, header: string[], rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    const text = v == null ? '' : String(v)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = String.fromCharCode(0xfeff) + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
