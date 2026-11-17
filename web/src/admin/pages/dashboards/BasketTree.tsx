import { useEffect, useRef } from 'react'
import type { TreeNode } from './dashboardApi'

export interface BasketColumn {
  key: string
  title: string
  nodes: TreeNode[]
  selectedId?: string
  onPick?: (node: TreeNode) => void
}

function shareText(node: TreeNode) {
  return node.sharePct == null ? '—' : `${node.sharePct.toLocaleString('vi-VN')}%`
}

function barWidth(node: TreeNode) {
  if (node.orders <= 0 || node.sharePct == null) return 0
  return Math.max(4, Math.min(100, node.sharePct))
}

/** Cây phân rã: mỗi mục một dòng (tên, thanh, tỷ lệ). Nhánh đang chọn được viền xanh. */
export default function BasketTree({ rootLabel, rootOrders, columns, loading, onReset }: {
  rootLabel: string
  rootOrders: number
  columns: BasketColumn[]
  loading: boolean
  onReset?: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const onWheel = (event: WheelEvent) => {
      if (scroller.scrollWidth <= scroller.clientWidth) return
      const column = event.target instanceof Element ? event.target.closest('[data-basket-col]') : null
      if (column instanceof HTMLElement && column.scrollHeight > column.clientHeight + 1) {
        const goingUp = event.deltaY < 0 && column.scrollTop > 0
        const goingDown = event.deltaY > 0 && column.scrollTop + column.clientHeight < column.scrollHeight - 1
        if (goingUp || goingDown) return
      }
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
      scroller.scrollLeft += event.deltaY
      event.preventDefault()
    }
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', onWheel)
  }, [columns.length, loading])

  if (loading && columns.length === 0) {
    return <p className="font-body-md text-body-md text-on-surface-variant">Đang tải cây mua kèm…</p>
  }

  return (
    <div ref={scrollerRef} className="basket-scroll pb-1">
      <div className="flex min-w-max items-start gap-2">
        <button type="button" className="mt-8 w-32 shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-3 text-left shadow-sm hover:border-[#2563eb]" onClick={onReset}>
          <div className="font-label-sm text-label-sm text-on-surface-variant">{rootLabel}</div>
          <div className="font-headline-md text-headline-md text-on-surface">{rootOrders.toLocaleString('vi-VN')}</div>
          <div className="font-label-sm text-label-sm text-on-surface-variant">đơn</div>
        </button>

        {columns.map((column, index) => (
          <section key={column.key} className="flex shrink-0 items-start gap-2">
            {index > 0 && <span className="mt-12 w-4 shrink-0 text-center font-title-md text-title-md text-[#2563eb]" aria-hidden="true">→</span>}
            <div className="w-[260px] shrink-0">
              <h3 className="mb-2 h-6 truncate font-title-md text-title-md text-on-surface" title={column.title}>{column.title}</h3>
              {column.nodes.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Không có nhánh.</p>
              ) : (
                <ul data-basket-col className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                  {column.nodes.map((node) => {
                    const selected = node.id === column.selectedId
                    return (
                      <li key={node.id}>
                        <button
                          type="button"
                          disabled={!column.onPick}
                          title={`${node.label} · ${node.orders.toLocaleString('vi-VN')} đơn · ${shareText(node)}`}
                          onClick={() => column.onPick?.(node)}
                          className={`block w-full rounded-md border px-2 py-1.5 text-left disabled:cursor-default ${selected ? 'border-[#2563eb] bg-blue-50' : 'border-transparent hover:bg-surface-container-low'}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 truncate font-body-md text-body-md text-on-surface">{node.label}</span>
                            <span className="shrink-0 font-label-sm text-label-sm tabular-nums text-on-surface">{shareText(node)}</span>
                          </span>
                          <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full bg-[#1e3a8a]" style={{ width: `${barWidth(node)}%` }} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
