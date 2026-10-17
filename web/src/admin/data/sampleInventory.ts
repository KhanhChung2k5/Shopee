// Mock data for InventoryStock (domain B) — quantity per product at the
// single central warehouse (this business has no multi-shop split, see
// class diagram v6 "1 doanh nghiệp bán lẻ duy nhất").
import { ALL_PRODUCTS } from '../../data/sampleProducts'

export interface StockRow {
  productId: string
  productName: string
  warehouse: string
  quantity: number
  reservedQty: number
}

const WAREHOUSES = ['Kho trung tâm HCM', 'Kho trung tâm HN']

export const INITIAL_STOCK: StockRow[] = ALL_PRODUCTS.map((p, i) => ({
  productId: p.id,
  productName: p.name,
  warehouse: WAREHOUSES[i % WAREHOUSES.length],
  quantity: 20 + ((i * 37) % 180),
  reservedQty: (i * 3) % 12,
}))
