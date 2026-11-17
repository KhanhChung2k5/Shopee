import { useCallback, useEffect, useMemo, useState } from 'react'
import { a, chipClass } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { formatVnd } from '../../../lib/catalog'
import {
  RECOMMENDATION_RULES, RFM_LABEL, fetchAllCrmCustomers, fetchProfile, fetchRecommendations, fetchSegments, pushRecommendations,
  type CrmCustomer, type RecommendationItem, type Segment,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'

interface Row {
  customer: CrmCustomer
  items: RecommendationItem[]
  rfm: string
  segmentIds: string[]
}

/** Marketing tự động: 5 quy tắc gợi ý, lọc RFM/phân khúc, đẩy vào hộp thư. CS + admin. */
export default function AdminMarketingAutoPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rule, setRule] = useState('')
  const [query, setQuery] = useState('')
  const [segmentIds, setSegmentIds] = useState<string[]>([])
  const [rfms, setRfms] = useState<string[]>([])
  const [focusId, setFocusId] = useState<string | null>(null)
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [pushing, setPushing] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setError('')
    setRows(null)
    try {
      const [customers, segmentPage] = await Promise.all([
        fetchAllCrmCustomers(token, true),
        fetchSegments(token).catch(() => ({ segments: [] as Segment[] })),
      ])
      setSegments(segmentPage.segments)
      const active = customers.filter((customer) => customer.status !== 'deleted')
      const built: Row[] = []
      const batch = 4
      for (let index = 0; index < active.length; index += batch) {
        const slice = active.slice(index, index + batch)
        setProgress(`Đang tải gợi ý ${Math.min(index + slice.length, active.length)}/${active.length}`)
        const part = await Promise.all(slice.map(async (customer) => {
          const [recs, profile] = await Promise.all([
            fetchRecommendations(token, customer.id).catch(() => ({ items: [] as RecommendationItem[] })),
            fetchProfile(token, customer.id).catch(() => null),
          ])
          return {
            customer,
            items: recs.items,
            rfm: profile?.rfmSegment ?? 'other',
            segmentIds: segmentPage.segments.filter((segment) => segment.members.some((member) => member.userId === customer.id)).map((segment) => segment.id),
          }
        }))
        built.push(...part)
      }
      setRows(built)
      setProgress('')
      setFocusId((current) => current ?? built[0]?.customer.id ?? null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tải được marketing tự động')
      setRows([])
      setProgress('')
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const ruleItem of RECOMMENDATION_RULES) map[ruleItem.id] = 0
    for (const row of rows ?? []) {
      for (const reason of new Set(row.items.map((item) => item.reason))) {
        if (map[reason] != null) map[reason] += 1
      }
    }
    return map
  }, [rows])

  const visible = (rows ?? []).filter((row) => {
    const needle = query.trim().toLowerCase()
    const blob = `${row.customer.fullName ?? ''} ${row.customer.email ?? ''} ${row.customer.phone ?? ''}`.toLowerCase()
    if (needle && !blob.includes(needle)) return false
    if (rule && !row.items.some((item) => item.reason === rule)) return false
    if (segmentIds.length && !segmentIds.some((id) => row.segmentIds.includes(id))) return false
    if (rfms.length && !rfms.includes(row.rfm)) return false
    return true
  })

  const focus = visible.find((row) => row.customer.id === focusId) ?? visible[0] ?? null
  const selectedIds = focus
    ? (picked[focus.customer.id] ?? focus.items.map((item) => item.productId))
    : []

  const togglePick = (productId: string) => {
    if (!focus) return
    const current = picked[focus.customer.id] ?? focus.items.map((item) => item.productId)
    const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    setPicked((map) => ({ ...map, [focus.customer.id]: next }))
  }

  const push = async () => {
    if (!token || !focus || selectedIds.length === 0) return
    setPushing(true)
    try {
      const result = await pushRecommendations(token, focus.customer.id, selectedIds)
      const name = focus.customer.fullName ?? 'khách'
      setNotice(result.sentCount
        ? `Đã đẩy gợi ý vào hộp thư của ${name}.`
        : `${name} không nhận thư (đã khóa, đã xóa hoặc chưa có gợi ý).`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không đẩy được gợi ý')
    } finally {
      setPushing(false)
    }
  }

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Marketing tự động</h1>
        <button type="button" className={buttonClass('outline')} onClick={() => void load()}>Tải lại</button>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">Gợi ý sản phẩm theo hành vi mua, rồi đẩy vào hộp thư in-app của từng khách.</p>
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      {notice && <p className="font-body-md text-body-md text-secondary mb-space-md">{notice}</p>}
      {progress && <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">{progress}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-space-sm mb-space-md">
        {RECOMMENDATION_RULES.map((item) => (
          <button key={item.id} type="button" className={cx(a.card, 'text-left !p-space-md', rule === item.id && 'ring-2 ring-primary')} onClick={() => setRule(rule === item.id ? '' : item.id)}>
            <div className="font-headline-md text-headline-md text-primary">{counts[item.id] ?? 0}</div>
            <div className="font-title-md text-title-md text-on-surface">{item.label}</div>
            <div className="font-label-md text-label-md text-on-surface-variant">{item.hint}</div>
          </button>
        ))}
      </div>

      <div className={a.toolbar}>
        <input className={`${a.input} !w-72`} type="search" placeholder="Tên, email hoặc SĐT…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className={a.filterBar}>
          {segments.map((segment) => (
            <button key={segment.id} type="button" className={chipClass(segmentIds.includes(segment.id))} onClick={() => setSegmentIds((ids) => ids.includes(segment.id) ? ids.filter((id) => id !== segment.id) : [...ids, segment.id])}>{segment.name}</button>
          ))}
          {Object.entries(RFM_LABEL).map(([key, label]) => (
            <button key={key} type="button" className={chipClass(rfms.includes(key))} onClick={() => setRfms((ids) => ids.includes(key) ? ids.filter((id) => id !== key) : [...ids, key])}>{label}</button>
          ))}
          {(rule || query || segmentIds.length || rfms.length) && (
            <button type="button" className={buttonClass('outline', 'sm')} onClick={() => { setRule(''); setQuery(''); setSegmentIds([]); setRfms([]) }}>Xóa bộ lọc</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-md items-start">
        <div className={cx(a.card, 'lg:col-span-2 !p-0 overflow-hidden')}>
          {!rows && <p className={a.empty}>Đang tải khách hàng…</p>}
          {rows && visible.length === 0 && <p className={a.empty}>Không có khách khớp bộ lọc.</p>}
          <ul className="divide-y divide-line max-h-[70vh] overflow-y-auto">
            {visible.map((row) => (
              <li key={row.customer.id}>
                <button type="button" className={cx('w-full text-left px-space-md py-space-sm', focus?.customer.id === row.customer.id ? 'bg-primary-fixed/50' : 'hover:bg-surface-container-low')} onClick={() => setFocusId(row.customer.id)}>
                  <div className="flex items-center justify-between gap-space-xs">
                    <span className="font-title-md text-title-md text-on-surface truncate">{row.customer.fullName ?? 'Khách hàng'}</span>
                    <Badge>{RFM_LABEL[row.rfm] ?? row.rfm}</Badge>
                  </div>
                  <p className="font-label-md text-label-md text-on-surface-variant">{row.items.length} gợi ý · {row.customer.email ?? '—'}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={cx(a.card, 'lg:col-span-3 space-y-space-md')}>
          {!focus && <p className={a.empty}>Chọn một khách để xem gợi ý.</p>}
          {focus && (
            <>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{focus.customer.fullName ?? 'Khách hàng'}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">{focus.customer.email ?? '—'}{focus.customer.phone ? ` · ${focus.customer.phone}` : ''} · {RFM_LABEL[focus.rfm] ?? focus.rfm}</p>
              </div>
              {focus.items.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">Khách này chưa có gợi ý.</p>}
              <ul className="space-y-space-xs">
                {focus.items.map((item) => (
                  <li key={item.productId} className="flex items-start gap-space-sm rounded-lg border border-line px-space-sm py-space-sm">
                    <input type="checkbox" className="mt-1 w-4 h-4 accent-primary" checked={selectedIds.includes(item.productId)} onChange={() => togglePick(item.productId)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-title-md text-title-md text-on-surface">{item.name}</div>
                      <div className="font-label-md text-label-md text-on-surface-variant">{item.reasonLabel} · {formatVnd(item.price)}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <button type="button" className={buttonClass('primary')} disabled={pushing || selectedIds.length === 0} onClick={() => void push()}>
                  {pushing ? 'Đang gửi…' : 'Đẩy vào hộp thư'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
