import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { buttonClass, cx } from '../../components/ui'
import {
  fetchCustomerReport,
  type CustomerReport,
  type ReportCustomer,
  type ReportFact,
} from '../../lib/crm'
import { a } from '../adminUi'
import { CustomerReportTabs } from './AdminSurveyStatsPage'

/** Nhóm tuổi trên biểu đồ. 35–44 và 45+ gộp thành 35+ như bản đang hiển thị. */
const AGE_AXIS = [
  { key: 'under18', label: 'Dưới 18' },
  { key: '18-24', label: '18–24' },
  { key: '25-34', label: '25–34' },
  { key: '35+', label: '35+' },
] as const

const GENDER_AXIS = [
  { key: 'male', label: 'Nam' },
  { key: 'female', label: 'Nữ' },
  { key: 'unknown', label: 'Không rõ' },
] as const

const RFM_AXIS = [
  { key: 'champions', label: 'Champions' },
  { key: 'loyal', label: 'Trung thành' },
  { key: 'at_risk', label: 'Có nguy cơ rời bỏ' },
  { key: 'potential', label: 'Tiềm năng' },
  { key: 'lost', label: 'Đã rời bỏ' },
  { key: 'other', label: 'Khác' },
  { key: 'new', label: 'Chưa mua hàng' },
] as const

/** Cận trên từng cột histogram. 0 đứng riêng vì nhóm chưa phát sinh LTV. */
const LTV_AXIS = [
  { key: '0', label: '0' },
  { key: '200k', label: '≤ 200k' },
  { key: '500k', label: '≤ 500k' },
  { key: '1tr', label: '≤ 1 tr' },
  { key: '2tr', label: '≤ 2 tr' },
  { key: '5tr', label: '≤ 5 tr' },
  { key: '10tr', label: '≤ 10 tr' },
  { key: '10tr+', label: '> 10 tr' },
] as const

type Dim = 'age' | 'gender' | 'rfm' | 'ltv' | 'category' | 'genre'
type Filters = Partial<Record<Dim, string>>

interface Person {
  id: string
  ageKey: string
  genderKey: string
  rfm: string
  ltvBin: string
}

interface SaleLine {
  customerId: string
  categoryName: string | null
  genre: string | null
  productId: string | null
  productName: string | null
  quantity: number
}

interface BarRow {
  key: string
  label: string
  count: number
}

interface ProductRank {
  id: string
  name: string
  quantity: number
}

const DIM_LABEL: Record<Dim, string> = {
  age: 'Độ tuổi',
  gender: 'Giới tính',
  rfm: 'RFM',
  ltv: 'LTV',
  category: 'Ngành hàng',
  genre: 'Thể loại',
}

function ageKey(code: string | null | undefined) {
  if (code === 'UNDER_18') return 'under18'
  if (code === '18–24' || code === '18-24') return '18-24'
  if (code === '25–34' || code === '25-34') return '25-34'
  if (code === '35–44' || code === '35-44' || code === '45+' || code === '35+') return '35+'
  return 'unknown'
}

function genderKey(code: string | null | undefined) {
  if (code === 'male' || code === 'female') return code
  return 'unknown'
}

function ltvBin(value: number) {
  if (value <= 0) return '0'
  if (value <= 200_000) return '200k'
  if (value <= 500_000) return '500k'
  if (value <= 1_000_000) return '1tr'
  if (value <= 2_000_000) return '2tr'
  if (value <= 5_000_000) return '5tr'
  if (value <= 10_000_000) return '10tr'
  return '10tr+'
}

function labelOf(dim: Dim, key: string) {
  const axis = dim === 'age' ? AGE_AXIS : dim === 'gender' ? GENDER_AXIS : dim === 'rfm' ? RFM_AXIS : dim === 'ltv' ? LTV_AXIS : null
  return axis?.find((item) => item.key === key)?.label ?? key
}

function peopleOf(customers: ReportCustomer[]): Person[] {
  return customers.map((customer) => ({
    id: customer.customerId,
    ageKey: ageKey(customer.age),
    genderKey: genderKey(customer.gender),
    rfm: customer.rfmSegment || 'new',
    ltvBin: ltvBin(Number(customer.ltv) || 0),
  }))
}

function linesOf(facts: ReportFact[]): SaleLine[] {
  return facts.map((fact) => ({
    customerId: fact.customerId,
    categoryName: fact.categoryName?.trim() || null,
    genre: fact.genre?.trim() || null,
    productId: fact.productId ?? null,
    productName: fact.productName?.trim() || null,
    quantity: fact.quantity && fact.quantity > 0 ? fact.quantity : 1,
  }))
}

function matches(person: Person, linesByCustomer: Map<string, SaleLine[]>, filters: Filters, except: Dim | null) {
  if (filters.age && except !== 'age' && person.ageKey !== filters.age) return false
  if (filters.gender && except !== 'gender' && person.genderKey !== filters.gender) return false
  if (filters.rfm && except !== 'rfm' && person.rfm !== filters.rfm) return false
  if (filters.ltv && except !== 'ltv' && person.ltvBin !== filters.ltv) return false
  const lines = linesByCustomer.get(person.id) ?? []
  if (filters.category && except !== 'category' && !lines.some((line) => line.categoryName === filters.category)) return false
  if (filters.genre && except !== 'genre' && !lines.some((line) => line.genre === filters.genre)) return false
  return true
}

function idSet(people: Person[], linesByCustomer: Map<string, SaleLine[]>, filters: Filters, except: Dim | null) {
  const ids = new Set<string>()
  for (const person of people) {
    if (matches(person, linesByCustomer, filters, except)) ids.add(person.id)
  }
  return ids
}

function countAxis(people: Person[], ids: Set<string>, axis: readonly { key: string; label: string }[], pick: (person: Person) => string, extraKeys: string[] = []) {
  const rows: BarRow[] = axis.map((item) => ({
    key: item.key,
    label: item.label,
    count: people.filter((person) => ids.has(person.id) && pick(person) === item.key).length,
  }))
  for (const key of extraKeys) {
    if (rows.some((row) => row.key === key)) continue
    rows.push({
      key,
      label: key,
      count: people.filter((person) => ids.has(person.id) && pick(person) === key).length,
    })
  }
  return rows
}

function countLines(lines: SaleLine[], ids: Set<string>, pick: (line: SaleLine) => string | null, selected: string | undefined) {
  const counts = new Map<string, number>()
  for (const line of lines) {
    const key = pick(line)
    if (!key || !ids.has(line.customerId)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  if (selected && !counts.has(selected)) counts.set(selected, 0)
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'))
}

function topProducts(lines: SaleLine[], ids: Set<string>, kind: 'category' | 'genre', key: string): ProductRank[] {
  const totals = new Map<string, ProductRank>()
  for (const line of lines) {
    if (!ids.has(line.customerId) || !line.productName) continue
    if (kind === 'category' && line.categoryName !== key) continue
    if (kind === 'genre' && line.genre !== key) continue
    const id = line.productId ?? line.productName
    const current = totals.get(id) ?? { id, name: line.productName, quantity: 0 }
    current.quantity += line.quantity
    totals.set(id, current)
  }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'vi'))
}

function visibleLtv(people: Person[]) {
  const used = new Set(people.map((person) => person.ltvBin))
  const indexes = LTV_AXIS.map((bin, index) => (used.has(bin.key) ? index : -1)).filter((index) => index >= 0)
  if (indexes.length === 0) return [LTV_AXIS[0]]
  return LTV_AXIS.slice(indexes[0], indexes[indexes.length - 1] + 1)
}

function buildDashboard(report: CustomerReport, filters: Filters) {
  const people = peopleOf(report.customers ?? [])
  const lines = linesOf(report.facts ?? [])
  const linesByCustomer = new Map<string, SaleLine[]>()
  for (const line of lines) {
    const bucket = linesByCustomer.get(line.customerId)
    if (bucket) bucket.push(line)
    else linesByCustomer.set(line.customerId, [line])
  }
  const cohort = idSet(people, linesByCustomer, filters, null)
  const ageIds = idSet(people, linesByCustomer, filters, 'age')
  const genderIds = idSet(people, linesByCustomer, filters, 'gender')
  const rfmIds = idSet(people, linesByCustomer, filters, 'rfm')
  const ltvIds = idSet(people, linesByCustomer, filters, 'ltv')
  const categoryIds = idSet(people, linesByCustomer, filters, 'category')
  const genreIds = idSet(people, linesByCustomer, filters, 'genre')
  const rfmKeys = [...new Set(people.map((person) => person.rfm))].filter((key) => !RFM_AXIS.some((item) => item.key === key))
  const ltvAxis = visibleLtv(people)
  return {
    total: people.length,
    cohortSize: cohort.size,
    unknownAge: people.filter((person) => ageIds.has(person.id) && person.ageKey === 'unknown').length,
    age: countAxis(people, ageIds, AGE_AXIS, (person) => person.ageKey),
    gender: countAxis(people, genderIds, GENDER_AXIS, (person) => person.genderKey),
    rfm: countAxis(people, rfmIds, RFM_AXIS, (person) => person.rfm, rfmKeys),
    ltv: ltvAxis.map((bin) => ({
      key: bin.key,
      label: bin.label,
      count: people.filter((person) => ltvIds.has(person.id) && person.ltvBin === bin.key).length,
    })),
    categories: countLines(lines, categoryIds, (line) => line.categoryName, filters.category),
    genres: countLines(lines, genreIds, (line) => line.genre, filters.genre),
    productsFor(kind: 'category' | 'genre', key: string) {
      return topProducts(lines, kind === 'category' ? categoryIds : genreIds, kind, key)
    },
  }
}

function ProductPopup({ title, products, above }: { title: string; products: ProductRank[]; above?: boolean }) {
  return (
    <div role="tooltip" className={cx('absolute left-0 z-30 w-72 max-w-[min(18rem,80vw)] rounded-xl border border-line bg-surface-container-lowest p-space-sm shadow-lg', above ? 'bottom-full mb-1' : 'top-full mt-1')}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-label-md text-label-md text-on-surface">{title}</p>
        <span className="shrink-0 font-label-md text-label-md text-on-surface-variant">SL</span>
      </div>
      {products.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Chưa có tên sản phẩm trên các đơn này.</p>
      ) : (
        <ol className="max-h-56 space-y-1 overflow-y-auto">
          {products.map((product, index) => (
            <li key={product.id} className="flex items-baseline justify-between gap-3 font-body-md text-body-md text-on-surface">
              <span className="min-w-0 truncate">
                <span className="mr-1.5 tabular-nums text-on-surface-variant">{index + 1}.</span>
                {product.name}
              </span>
              <span className="shrink-0 font-bold tabular-nums">{product.quantity}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function BarChart({
  rows,
  selected,
  onSelect,
  labelWidth = '148px',
  productsFor,
  popupAbove = false,
}: {
  rows: BarRow[]
  selected?: string
  onSelect: (key: string) => void
  labelWidth?: string
  productsFor?: (key: string) => ProductRank[]
  popupAbove?: boolean
}) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  const [hover, setHover] = useState<string | null>(null)
  if (rows.length === 0) {
    return <p className="font-body-md text-body-md text-on-surface-variant">Không có dữ liệu trong bộ lọc này.</p>
  }
  return (
    <div className={cx('flex flex-col gap-1', hover && 'relative z-20')}>
      {rows.map((row) => {
        const pressed = selected === row.key
        const products = hover === row.key && productsFor ? productsFor(row.key) : null
        return (
          <div
            key={row.key}
            className={cx('relative', hover === row.key && 'z-10')}
            onMouseEnter={() => productsFor && setHover(row.key)}
            onMouseLeave={() => setHover((current) => (current === row.key ? null : current))}
          >
            <button
              type="button"
              aria-pressed={pressed}
              title={pressed ? `${row.label}: đang lọc, bấm để bỏ` : `${row.label}: bấm để lọc các biểu đồ khác`}
              onClick={() => onSelect(row.key)}
              onFocus={() => productsFor && setHover(row.key)}
              onBlur={() => setHover((current) => (current === row.key ? null : current))}
              className={cx(
                'grid w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-1.5 py-1 text-left font-body-md text-body-md text-on-surface',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                pressed ? 'bg-primary-fixed' : 'hover:bg-surface-container-low',
              )}
              style={{ gridTemplateColumns: `${labelWidth} 1fr 40px` }}
            >
              <span className="truncate" title={row.label}>{row.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-surface-container-high">
                <span
                  className="block h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(row.count / max) * 100}%`, opacity: selected && !pressed ? 0.4 : 1 }}
                />
              </span>
              <span className="text-right font-bold tabular-nums">{row.count}</span>
            </button>
            {products && row.count > 0 && <ProductPopup title={row.label} products={products} above={popupAbove} />}
          </div>
        )
      })}
    </div>
  )
}

function LtvHistogram({ rows, selected, onSelect }: { rows: BarRow[]; selected?: string; onSelect: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <div className="overflow-x-auto">
      <div className="flex h-48 min-w-[520px] items-stretch gap-1.5" role="group" aria-label="Histogram LTV dự báo">
        {rows.map((row) => {
          const pressed = selected === row.key
          const height = row.count === 0 ? '2px' : `${Math.max(6, (row.count / max) * 100)}%`
          return (
            <button
              key={row.key}
              type="button"
              aria-pressed={pressed}
              title={pressed ? `${row.label}: đang lọc, bấm để bỏ` : `${row.label}: ${row.count} khách, bấm để lọc các biểu đồ khác`}
              onClick={() => onSelect(row.key)}
              className={cx(
                'flex min-w-0 flex-1 cursor-pointer flex-col rounded-lg border-0 bg-transparent px-0.5 py-1',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                pressed ? 'bg-primary-fixed' : 'hover:bg-surface-container-low',
              )}
            >
              <span className="text-center font-label-md text-label-md font-bold tabular-nums text-on-surface">{row.count}</span>
              <span className="mt-1 flex min-h-0 flex-1 items-end">
                <span
                  className="block w-full rounded-t-md bg-primary transition-all"
                  style={{ height, opacity: selected && !pressed ? 0.4 : 1 }}
                />
              </span>
              <span className="mt-1.5 text-center font-label-sm text-label-sm leading-tight text-on-surface-variant">{row.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminDemographicsPage() {
  const { token } = useAuth()
  const [report, setReport] = useState<CustomerReport | null>(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters>({})

  useEffect(() => {
    if (!token) return
    let active = true
    fetchCustomerReport(token)
      .then((next) => { if (active) setReport(next) })
      .catch(() => { if (active) setError('Không tải được báo cáo khách hàng') })
    return () => { active = false }
  }, [token])

  const view = useMemo(() => (report ? buildDashboard(report, filters) : null), [report, filters])
  const activeFilters = (Object.keys(filters) as Dim[]).filter((dim) => filters[dim])

  function select(dim: Dim, key: string) {
    setFilters((current) => {
      if (current[dim] === key) {
        const next = { ...current }
        delete next[dim]
        return next
      }
      return { ...current, [dim]: key }
    })
  }

  const summary = activeFilters.map((dim) => `${DIM_LABEL[dim]} ${labelOf(dim, filters[dim]!)}`).join(', ')

  return (
    <div>
      <h1>Báo cáo khách hàng</h1>
      <CustomerReportTabs />
      <div className="mb-space-md flex flex-wrap items-start justify-between gap-space-md">
        <p className="max-w-3xl font-body-md text-body-md text-on-surface-variant">
          Tính trên {view?.total ?? '…'} khách đang hoạt động hoặc bị khoá (không tính tài khoản đã xoá).
          Bấm một cột để các biểu đồ còn lại tính lại theo nhóm đó. Rê chuột vào ngành hàng hoặc thể loại game để xem sản phẩm được mua nhiều nhất.
          {view && activeFilters.length > 0 && ` Đang thu hẹp còn ${view.cohortSize} khách: ${summary}.`}
        </p>
        <button
          type="button"
          className={buttonClass('outline', 'sm')}
          disabled={activeFilters.length === 0}
          onClick={() => setFilters({})}
        >
          Đặt lại biểu đồ
        </button>
      </div>
      <p className="sr-only" aria-live="polite">{summary ? `Đang lọc ${summary}` : 'Đang xem toàn bộ khách hàng'}</p>
      {error && <p className="mb-space-md font-body-md text-body-md text-error">{error}</p>}

      {view && activeFilters.length > 0 && (
        <div className="mb-space-md flex flex-wrap gap-2">
          {activeFilters.map((dim) => (
            <button
              key={dim}
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 font-label-md text-label-md text-on-primary-fixed"
              onClick={() => select(dim, filters[dim]!)}
            >
              {DIM_LABEL[dim]}: {labelOf(dim, filters[dim]!)}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Bỏ lọc</span>
            </button>
          ))}
        </div>
      )}

      {!view && !error && <p className="font-body-md text-body-md text-on-surface-variant">Đang tải…</p>}

      {view && (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          <section className={a.card} aria-labelledby="chart-age">
            <h2 id="chart-age" className={`${a.statLabel} !mb-space-md`}>Phân bố độ tuổi</h2>
            <BarChart rows={view.age} selected={filters.age} onSelect={(key) => select('age', key)} labelWidth="92px" />
            {view.unknownAge > 0 && (
              <p className="mt-space-sm font-label-md text-label-md text-on-surface-variant">{view.unknownAge} khách chưa có ngày sinh, không nằm trong các cột tuổi.</p>
            )}
          </section>
          <section className={a.card} aria-labelledby="chart-gender">
            <h2 id="chart-gender" className={`${a.statLabel} !mb-space-md`}>Phân bố giới tính</h2>
            <BarChart rows={view.gender} selected={filters.gender} onSelect={(key) => select('gender', key)} labelWidth="92px" />
          </section>
          <section className={a.card} aria-labelledby="chart-rfm">
            <h2 id="chart-rfm" className={`${a.statLabel} !mb-space-md`}>Phân nhóm RFM</h2>
            <BarChart rows={view.rfm} selected={filters.rfm} onSelect={(key) => select('rfm', key)} labelWidth="168px" />
          </section>
          <section className={a.card} aria-labelledby="chart-ltv">
            <h2 id="chart-ltv" className={`${a.statLabel} !mb-space-md`}>Histogram LTV dự báo</h2>
            <p className="mb-space-sm font-label-md text-label-md text-on-surface-variant">Mỗi cột là số khách có LTV dự báo trong khoảng đó. Mốc 0 là khách chưa phát sinh giá trị.</p>
            <LtvHistogram rows={view.ltv} selected={filters.ltv} onSelect={(key) => select('ltv', key)} />
          </section>
          <section className={a.card} aria-labelledby="chart-category">
            <h2 id="chart-category" className={`${a.statLabel} !mb-space-md`}>Ngành hàng ưa thích (theo đơn đã giao)</h2>
            <BarChart
              rows={view.categories}
              selected={filters.category}
              onSelect={(key) => select('category', key)}
              productsFor={(key) => view.productsFor('category', key)}
              popupAbove
            />
          </section>
          <section className={a.card} aria-labelledby="chart-genre">
            <h2 id="chart-genre" className={`${a.statLabel} !mb-space-md`}>Thể loại game được mua</h2>
            <BarChart
              rows={view.genres}
              selected={filters.genre}
              onSelect={(key) => select('genre', key)}
              productsFor={(key) => view.productsFor('genre', key)}
              popupAbove
            />
          </section>
        </div>
      )}
    </div>
  )
}
