import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../../lib/api'
import { useAuth } from '../../../state/AuthContext'
import { a } from '../../adminUi'
import { useReport, type BehaviorReport, type BehaviorTree, type TreeNode } from './dashboardApi'
import BasketTree, { type BasketColumn } from './BasketTree'
import { RFM_LABEL } from '../../../lib/crm'
import { DashboardFilters } from './dashboardFilters'
import { Histogram, Note, Panel, Stats, Status } from './dashboardUi'

interface Drill {
  categoryId?: string
  uncategorized?: boolean
  productType?: string
  productId?: string
  variantId?: string
}

interface Crumb {
  label: string
  drill: Drill
}

function pct(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN')}%`
}

function days(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN')} ngày`
}

const CHILD_TITLE: Record<string, string> = {
  root: 'Nhóm hàng',
  category: 'Loại sản phẩm',
  type: 'Sản phẩm',
  product: 'Biến thể',
}

function selectedIdOf(level: string, crumb?: Crumb) {
  if (!crumb) return undefined
  if (level === 'root') return crumb.drill.uncategorized ? 'none' : crumb.drill.categoryId
  if (level === 'category') return crumb.drill.productType
  if (level === 'type') return crumb.drill.productId
  if (level === 'product') return crumb.drill.variantId
  return undefined
}

function queryOf(base: string, drill: Drill) {
  const params = new URLSearchParams(base)
  if (drill.categoryId) params.set('categoryId', drill.categoryId)
  if (drill.uncategorized) params.set('uncategorized', 'true')
  if (drill.productType) params.set('productType', drill.productType)
  if (drill.productId) params.set('productId', drill.productId)
  if (drill.variantId) params.set('variantId', drill.variantId)
  return params.toString()
}

export default function BehaviorPage() {
  const { token } = useAuth()
  const report = useReport<BehaviorReport>('/api/dashboards/behavior')
  const data = report.data
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ label: 'Mọi đơn', drill: {} }])
  const [treeError, setTreeError] = useState<string | null>(null)

  const [levels, setLevels] = useState<BehaviorTree[]>([])
  const [treeLoading, setTreeLoading] = useState(false)

  const seenQuery = useRef(report.query)
  if (seenQuery.current !== report.query) {
    seenQuery.current = report.query
    setCrumbs([{ label: 'Mọi đơn', drill: {} }])
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setTreeLoading(true)
    Promise.all(crumbs.map((crumb) => apiFetch<BehaviorTree>(
      `/api/dashboards/behavior/tree?${queryOf(report.query, crumb.drill)}`,
      {},
      token,
    )))
      .then((nodes) => {
        if (!cancelled) {
          setLevels(nodes)
          setTreeError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setTreeError(err.message)
      })
      .finally(() => {
        if (!cancelled) setTreeLoading(false)
      })
    return () => { cancelled = true }
  }, [token, report.query, crumbs])

  // Nhóm hàng chỉ có một loại trùng tên thì bỏ cột đó và mở thẳng danh sách sản phẩm.
  useEffect(() => {
    const last = levels[levels.length - 1]
    if (!last || last.level !== 'category' || last.children.length !== 1) return
    const only = last.children[0]
    setCrumbs((prev) => {
      if (prev.length !== levels.length) return prev
      const parent = prev[prev.length - 1]
      if (!parent || parent.drill.productType) return prev
      return [...prev, { label: only.label, drill: { ...parent.drill, productType: only.id } }]
    })
  }, [levels])

  function selectChild(parentIndex: number, level: string, node: TreeNode) {
    setCrumbs((prev) => {
      const base = prev.slice(0, parentIndex + 1)
      const parentDrill = base[base.length - 1]?.drill ?? {}
      let next: Drill
      if (level === 'root') next = node.id === 'none' ? { uncategorized: true } : { categoryId: node.id }
      else if (level === 'category') next = { ...parentDrill, productType: node.id }
      else if (level === 'type') next = { ...parentDrill, productId: node.id }
      else if (level === 'product') next = { ...parentDrill, variantId: node.id }
      else return prev
      return [...base, { label: node.label, drill: next }]
    })
  }

  function openCompanion(level: string, node: TreeNode) {
    if (level === 'category' || level === 'type') {
      const category = levels[0]?.children.find((child) => child.label === node.label)
      const next: Drill = category
        ? (category.id === 'none' ? { uncategorized: true } : { categoryId: category.id })
        : level === 'type'
          ? { productType: node.id }
          : node.id === 'none' ? { uncategorized: true } : { categoryId: node.id }
      setCrumbs([{ label: 'Mọi đơn', drill: {} }, { label: category?.label ?? node.label, drill: next }])
    } else if (level === 'product') {
      setCrumbs([
        { label: 'Mọi đơn', drill: {} },
        { label: node.label, drill: { productId: node.id } },
      ])
    }
  }

  const root = levels[0]
  const columns: BasketColumn[] = levels.flatMap((level, index) => {
    const built: BasketColumn[] = []
    const redundantType = level.level === 'category' && level.children.length === 1
    if (level.children.length > 0 && !redundantType) {
      built.push({
        key: `child-${index}`,
        title: CHILD_TITLE[level.level] ?? 'Nhánh',
        nodes: [...level.children].sort((a, b) => b.orders - a.orders),
        selectedId: selectedIdOf(level.level, crumbs[index + 1]),
        onPick: (node) => selectChild(index, level.level, node),
      })
    }
    if (index === levels.length - 1 && level.companions.length > 0) {
      built.push({
        key: `with-${index}`,
        title: level.companionLabel ?? 'Mua kèm',
        nodes: [...level.companions].sort((a, b) => b.orders - a.orders),
        onPick: level.level === 'variant' ? undefined : (node) => openCompanion(level.level, node),
      })
    }
    return built
  })
  const cappedProducts = levels.some((level) => level.level === 'type' && level.children.length >= 50)

  return (
    <div className={a.formGrid}>
      <div className="col-span-full">
        <h1>Hành vi khách hàng</h1>
        <Note>
          Cây phân rã đếm đơn có cùng order_id. Một đơn có thể đứng ở nhiều nhánh. Tỷ lệ giỏ nhiều nhóm tính trên đơn không huỷ.
          Khoảng cách mua là số ngày giữa hai đơn đã giao liên tiếp của cùng khách, lấy lần mua sau rơi trong kỳ.
        </Note>
        <DashboardFilters
          from={report.from}
          to={report.to}
          onRange={report.setRange}
          segments={report.segments}
          onSegments={report.setSegments}
          productTypes={report.productTypes}
          onProductTypes={report.setProductTypes}
        />
        <Status loading={report.loading} error={report.error} />
      </div>
      {data && (
        <div className="col-span-full">
          <Stats items={[
            { label: 'Đơn trong kỳ', value: data.orders.toLocaleString('vi-VN') },
            { label: 'Giỏ nhiều nhóm hàng', value: pct(data.crossCategoryRatePct), hint: `${data.crossCategoryOrders.toLocaleString('vi-VN')} đơn có từ 2 category` },
            { label: 'Trung bình khoảng cách mua', value: days(data.avgIntervalDays), hint: data.repeatPurchases === 0 ? 'Chưa có lần mua lặp trong kỳ' : `${data.repeatPurchases.toLocaleString('vi-VN')} lần mua lặp` },
            { label: 'Trung vị khoảng cách mua', value: days(data.medianIntervalDays), hint: data.repeatPurchases === 0 ? 'Chưa có lần mua lặp trong kỳ' : `${data.repeatPurchases.toLocaleString('vi-VN')} lần mua lặp` },
            { label: 'Giỏ nhiều loại sản phẩm', value: pct(data.crossTypeRatePct), hint: `${data.crossTypeOrders.toLocaleString('vi-VN')} đơn có từ 2 product_type` },
          ]} />

          <Panel title="Chu kỳ giữa hai lần mua đã giao">
            <Histogram
              ariaLabel="Chu kỳ giữa hai lần mua đã giao"
              rows={data.intervals.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                value: bucket.count,
                segments: (bucket.segments ?? []).map((share) => ({
                  key: share.segment,
                  label: RFM_LABEL[share.segment] ?? share.segment,
                  count: share.count,
                  percent: share.percent,
                })),
              }))}
            />
          </Panel>

          <Panel title="Sản phẩm mua cùng nhau">
            <p className="mb-space-md font-body-md text-body-md text-on-surface-variant">
              Thanh dài theo tỷ lệ đơn của nhánh cha. Bấm một thanh để mở tầng tiếp theo; cột cuối là món hay có trong cùng đơn.
            </p>
            {treeError && <p role="alert" className="font-body-md text-body-md text-error mb-space-sm">{treeError}</p>}
            {root && (
              <BasketTree
                rootLabel={root.label}
                rootOrders={root.orders}
                columns={columns}
                loading={treeLoading}
                onReset={() => setCrumbs([{ label: 'Mọi đơn', drill: {} }])}
              />
            )}
            {cappedProducts && <p className="mt-space-sm font-body-md text-body-md text-on-surface-variant">Hiện 50 sản phẩm có nhiều đơn nhất.</p>}
          </Panel>
        </div>
      )}
    </div>
  )
}
