import { a } from '../../adminUi'
import { buttonClass } from '../../../components/ui'
import { formatVnd, typeLabel, type ProductType } from '../../../lib/catalog'
import { downloadCsv } from '../../reports'
import DonutChart from '../../components/DonutChart'
import {
  CashFlowBarChart,
  CategoryDrilldownPanel,
  ChartTableSplit,
  type CashFlowPoint,
} from '../../components/AnalyticsWidgets'
import { useReport, type SalesReport } from './dashboardApi'
import { DashboardFilters } from './dashboardFilters'
import { HBars, MonthLines, Note, Panel, Stats, Status } from './dashboardUi'

const METHOD: Record<string, string> = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản',
  wallet: 'Ví',
  unknown: 'Không rõ',
}

const PAYMENT_STATUS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thu',
  cancelled: 'Thất bại (huỷ thu)',
  refunded: 'Đã hoàn hết',
  partially_refunded: 'Hoàn một phần',
}

const KIND: Record<string, string> = {
  return: 'Trả hàng',
  cancellation: 'Huỷ đơn đã thu tiền',
}

const STAGE: Record<string, string> = {
  'pending→confirmed': 'Chờ xử lý → Đã xác nhận',
  'confirmed→shipping': 'Đã xác nhận → Đang giao',
  'shipping→delivered': 'Đang giao → Đã giao',
}

const METHOD_COLOR: Record<string, string> = {
  bank_transfer: '#0284c7',
  cod: '#f97316',
  wallet: '#ca8a04',
  unknown: '#64748b',
}

function yoyText(value: number | null | undefined) {
  if (value == null) return '—'
  if (value === 0) return '0%'
  const arrow = value > 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(value).toLocaleString('vi-VN')}%`
}

function pct(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN')}%`
}

function monthLabel(month: string) {
  const [year, m] = month.split('-')
  return `T${Number(m)}/${year.slice(2)}`
}

function hours(value: number | null) {
  if (value == null) return '—'
  if (value < 1) return `${Math.round(value * 60)} phút`
  return `${value.toLocaleString('vi-VN')} giờ`
}

function typeName(type: string) {
  return typeLabel[type as ProductType] ?? type
}

export default function SalesOpsPage() {
  const report = useReport<SalesReport>('/api/dashboards/sales')
  const data = report.data
  const formClass = a.formGrid

  const methodCounts = new Map<string, number>()
  for (const slice of data?.payments ?? []) {
    methodCounts.set(slice.method, (methodCounts.get(slice.method) ?? 0) + slice.count)
  }
  const paymentTotal = [...methodCounts.values()].reduce((sum, count) => sum + count, 0)
  const failed = (data?.payments ?? []).filter((slice) => slice.status === 'cancelled').reduce((sum, slice) => sum + slice.count, 0)
  const pending = (data?.payments ?? []).filter((slice) => slice.status === 'pending').reduce((sum, slice) => sum + slice.count, 0)

  const cashFlowPoints: CashFlowPoint[] = (data?.months ?? []).map((m) => {
    const imp = m.importExpense ?? 0
    const ref = m.refunds ?? 0
    const exp = imp + ref
    return {
      key: m.month,
      label: monthLabel(m.month),
      income: m.collected,
      expense: exp,
      importExpense: imp,
      refunds: ref,
      net: m.collected - exp,
    }
  })

  const totalImport = data?.importExpense ?? 0
  const totalOutflow = totalImport + (data?.refundedAmount ?? 0)
  const netCash = data?.netCashFlow ?? ((data?.collected ?? 0) - totalOutflow)

  const exportSalesCsv = () => {
    if (!data) return
    downloadCsv(
      `doanh-thu-thu-chi_${data.from}_${data.to}.csv`,
      ['Tháng', 'Số đơn', 'GMV', 'Doanh thu thuần SP', 'Số thu', 'Chi nhập hàng', 'Hoàn tiền', 'Dòng tiền ròng', 'AOV'],
      data.months.map((m) => [
        m.month,
        m.orders,
        m.gmv,
        m.netProduct,
        m.collected,
        m.importExpense ?? 0,
        m.refunds ?? 0,
        m.collected - (m.importExpense ?? 0) - (m.refunds ?? 0),
        m.aov,
      ]),
    )
  }

  return (
    <div className={formClass}>
      <div className="col-span-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>Doanh thu, Thu – Chi & vận hành đơn hàng</h1>
          <button type="button" className={buttonClass('secondary', 'sm')} disabled={!data || report.loading} onClick={exportSalesCsv}>
            Xuất Excel (CSV)
          </button>
        </div>
        <Note>
          Doanh thu thuần sản phẩm = tạm tính − giảm giá. Số thu = tổng đơn (gồm phí ship).
          Chi nhập hàng lấy từ phiếu nhập đã duyệt trong kỳ. YoY so doanh thu thuần với đúng khoảng ngày năm trước.
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
            { label: 'Doanh thu thuần sản phẩm', value: formatVnd(data.netProduct), hint: `${data.orders.toLocaleString('vi-VN')} đơn không huỷ · subtotal − discount` },
            { label: 'Tổng Thu trên đơn', value: formatVnd(data.collected), hint: `AOV ${formatVnd(data.aov)}`, tone: 'up' },
            {
              label: 'Tổng Chi (nhập + hoàn)',
              value: formatVnd(totalOutflow),
              hint: `Nhập hàng ${formatVnd(totalImport)} · Hoàn ${formatVnd(data.refundedAmount)} (${data.refundCount} khoản)`,
              tone: 'down',
            },
            {
              label: 'Dòng tiền ròng (Thu − Chi)',
              value: `${netCash >= 0 ? '+' : ''}${formatVnd(netCash)}`,
              hint: netCash >= 0 ? 'Dương dòng tiền trong kỳ' : 'Chi đang vượt Thu trong kỳ',
              tone: netCash >= 0 ? 'up' : 'down',
            },
            {
              label: 'YoY doanh thu thuần',
              value: yoyText(data.yoyPct),
              hint: data.yoyPct == null ? 'Chưa có doanh thu thuần cùng kỳ năm trước' : `Cùng kỳ năm trước ${formatVnd(data.priorNetProduct)}`,
              tone: data.yoyPct == null || data.yoyPct === 0 ? undefined : data.yoyPct > 0 ? 'up' : 'down',
            },
          ]} />

          {/* 1. Xu hướng doanh thu + Bảng chi tiết theo tháng kế bên */}
          <Panel title="Doanh thu thuần và số thu theo tháng">
            <ChartTableSplit
              chart={
                <MonthLines months={data.months.map((month) => ({
                  label: monthLabel(month.month),
                  net: month.netProduct,
                  collected: month.collected,
                }))} />
              }
              table={
                <div className={`${a.tableWrap} max-h-80 overflow-y-auto`}>
                  <table className={a.tableCompact}>
                    <thead className="sticky top-0 bg-surface-container-lowest z-10">
                      <tr>
                        <th>Tháng</th>
                        <th className="!text-right">Đơn</th>
                        <th className="!text-right">Thuần SP</th>
                        <th className="!text-right">Số thu</th>
                        <th className="!text-right">AOV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.months.map((m) => (
                        <tr key={m.month}>
                          <td className="font-medium">{monthLabel(m.month)}</td>
                          <td className="text-right tabular-nums">{m.orders.toLocaleString('vi-VN')}</td>
                          <td className="text-right tabular-nums font-medium">{formatVnd(m.netProduct)}</td>
                          <td className="text-right tabular-nums">{formatVnd(m.collected)}</td>
                          <td className="text-right tabular-nums text-on-surface-variant">{formatVnd(m.aov)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          {/* 2. Thu vs Chi theo tháng: Biểu đồ cột đôi + Bảng Thu-Chi kế bên */}
          <Panel title="So sánh Thu vs Chi theo tháng">
            <ChartTableSplit
              chart={
                <CashFlowBarChart
                  points={cashFlowPoints}
                  incomeLabel="Thu (số thu trên đơn)"
                  expenseLabel="Chi (nhập hàng + hoàn tiền)"
                />
              }
              table={
                <div className={`${a.tableWrap} max-h-80 overflow-y-auto`}>
                  <table className={a.tableCompact}>
                    <thead className="sticky top-0 bg-surface-container-lowest z-10">
                      <tr>
                        <th>Tháng</th>
                        <th className="!text-right">Thu</th>
                        <th className="!text-right">Chi nhập</th>
                        <th className="!text-right">Hoàn tiền</th>
                        <th className="!text-right">Thu − Chi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlowPoints.map((pt) => (
                        <tr key={pt.key}>
                          <td className="font-medium">{pt.label}</td>
                          <td className="text-right tabular-nums text-emerald-700 font-medium">{formatVnd(pt.income)}</td>
                          <td className="text-right tabular-nums text-red-600">{formatVnd(pt.importExpense)}</td>
                          <td className="text-right tabular-nums text-on-surface-variant">{formatVnd(pt.refunds)}</td>
                          <td className={`text-right tabular-nums font-semibold ${pt.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {pt.net >= 0 ? '+' : ''}{formatVnd(pt.net)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-line bg-surface-container-low/60 font-bold">
                        <td>Tổng kỳ</td>
                        <td className="text-right tabular-nums text-emerald-700">{formatVnd(data.collected)}</td>
                        <td className="text-right tabular-nums text-red-600">{formatVnd(totalImport)}</td>
                        <td className="text-right tabular-nums">{formatVnd(data.refundedAmount)}</td>
                        <td className={`text-right tabular-nums ${netCash >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {netCash >= 0 ? '+' : ''}{formatVnd(netCash)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          {/* 3. Doanh thu theo từng danh mục (Drilldown Quý -> Tháng -> Tuần) + Table kế bên */}
          <CategoryDrilldownPanel
            title="Doanh thu theo từng danh mục (Drilldown Quý → Tháng → Tuần)"
            days={data.categoryDays ?? []}
          />

          {/* 4. Giá trị hàng theo loại sản phẩm + Bảng AOV kế bên */}
          <Panel title="Giá trị hàng & AOV theo loại sản phẩm">
            <ChartTableSplit
              chart={
                <div>
                  <HBars rows={data.byProductType.map((row) => ({
                    label: typeName(row.productType),
                    value: row.merchandise,
                    display: formatVnd(row.merchandise),
                  }))} />
                  <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
                    Giá trị tính theo line_total, chưa phân bổ giảm giá hoá đơn.
                  </p>
                </div>
              }
              table={
                <div className={a.tableWrap}>
                  <table className={a.tableCompact}>
                    <thead>
                      <tr><th>Loại</th><th className="!text-right">Số đơn</th><th className="!text-right">Giá trị hàng</th><th className="!text-right">AOV loại</th></tr>
                    </thead>
                    <tbody>
                      {data.byProductType.map((row) => (
                        <tr key={row.productType}>
                          <td className="font-medium">{typeName(row.productType)}</td>
                          <td className="text-right tabular-nums">{row.orders.toLocaleString('vi-VN')}</td>
                          <td className="text-right tabular-nums font-medium">{formatVnd(row.merchandise)}</td>
                          <td className="text-right tabular-nums">{formatVnd(row.aov)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          {/* 5. Phương thức thanh toán (DonutChart) + Bảng trạng thái kế bên */}
          <Panel title="Phương thức & trạng thái thanh toán">
            <ChartTableSplit
              chart={
                <div>
                  {paymentTotal === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">Không có thanh toán checkout trong kỳ.</p> : (
                    <DonutChart
                      segments={[...methodCounts.entries()].map(([method, count]) => ({
                        label: METHOD[method] ?? method,
                        value: count,
                        color: METHOD_COLOR[method] ?? '#64748b',
                      }))}
                    />
                  )}
                  <p className="mt-space-md font-body-md text-body-md">
                    Thất bại {pct(paymentTotal === 0 ? null : Math.round((failed / paymentTotal) * 1000) / 10)}
                    {' · '}
                    Đang chờ {pct(paymentTotal === 0 ? null : Math.round((pending / paymentTotal) * 1000) / 10)}
                  </p>
                </div>
              }
              table={
                <div className={a.tableWrap}>
                  <table className={a.tableCompact}>
                    <thead>
                      <tr><th>Phương thức</th><th>Trạng thái</th><th className="!text-right">Số lần</th><th className="!text-right">Số tiền</th></tr>
                    </thead>
                    <tbody>
                      {data.payments.length === 0 && <tr><td colSpan={4}>Không có dữ liệu.</td></tr>}
                      {data.payments.map((slice) => (
                        <tr key={`${slice.method}-${slice.status}`}>
                          <td>{METHOD[slice.method] ?? slice.method}</td>
                          <td>{PAYMENT_STATUS[slice.status] ?? slice.status}</td>
                          <td className="text-right tabular-nums">{slice.count.toLocaleString('vi-VN')}</td>
                          <td className="text-right tabular-nums font-medium">{formatVnd(slice.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          <Panel title="Hoàn tiền theo lý do">
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Tỷ lệ đơn đã giao có hoàn: {pct(data.refundRatePct)} ({data.refundedOrders.toLocaleString('vi-VN')} / {data.deliveredOrders.toLocaleString('vi-VN')} đơn tạo trong kỳ).
              Bảng dưới là khoản đã chuyển trong kỳ, nhóm theo đúng chữ lý do.
            </p>
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr><th>Loại</th><th>Lý do</th><th className="!text-right">Số khoản</th><th className="!text-right">Số tiền</th></tr>
                </thead>
                <tbody>
                  {data.refundReasons.length === 0 && <tr><td colSpan={4}>Không có khoản hoàn trong kỳ.</td></tr>}
                  {data.refundReasons.map((row) => (
                    <tr key={`${row.kind}-${row.reason}`}>
                      <td>{KIND[row.kind] ?? row.kind}</td>
                      <td>{row.reason}</td>
                      <td className="text-right tabular-nums">{row.count.toLocaleString('vi-VN')}</td>
                      <td className="text-right tabular-nums font-medium">{formatVnd(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Thời gian xử lý đơn đã giao">
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Trung bình giữa mốc sớm nhất của từng trạng thái. Bỏ qua yêu cầu huỷ. Đơn thiếu một mốc thì không tính chặng đó.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {data.stages.map((stage) => (
                <div key={`${stage.fromStatus}-${stage.toStatus}`} className="rounded-lg bg-surface-container-low p-space-md">
                  <div className={a.statLabel}>{STAGE[`${stage.fromStatus}→${stage.toStatus}`] ?? `${stage.fromStatus} → ${stage.toStatus}`}</div>
                  <div className="font-headline-md text-headline-md">{hours(stage.avgHours)}</div>
                  <p className="font-body-md text-body-md text-on-surface-variant">{stage.orders.toLocaleString('vi-VN')} đơn</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
