import { a } from '../../adminUi'
import { formatVnd, typeLabel, type ProductType } from '../../../lib/catalog'
import DonutChart from '../../components/DonutChart'
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

  return (
    <div className={formClass}>
      <div className="col-span-full">
        <h1>Doanh thu & vận hành đơn hàng</h1>
        <Note>
          Doanh thu thuần sản phẩm là tạm tính trừ giảm giá. Số thu là tổng đơn, đã gồm phí vận chuyển.
          Tiền hoàn được ghi riêng và không bị trừ khỏi doanh thu. Đơn huỷ không tính vào doanh thu. Thanh toán tính cả đơn huỷ để thấy lần thu thất bại.
          YoY so doanh thu thuần với đúng khoảng ngày của năm trước.
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
            { label: 'Số thu trên đơn', value: formatVnd(data.collected), hint: `AOV ${formatVnd(data.aov)}` },
            {
              label: 'YoY doanh thu thuần',
              value: yoyText(data.yoyPct),
              hint: data.yoyPct == null ? 'Chưa có doanh thu thuần cùng kỳ năm trước' : `Cùng kỳ năm trước ${formatVnd(data.priorNetProduct)}`,
              tone: data.yoyPct == null || data.yoyPct === 0 ? undefined : data.yoyPct > 0 ? 'up' : 'down',
            },
            { label: 'Tiền đã hoàn', value: formatVnd(data.refundedAmount), hint: `${data.refundCount.toLocaleString('vi-VN')} khoản hoàn trong kỳ` },
          ]} />

          <Panel title="Doanh thu thuần và số thu theo tháng">
            <MonthLines months={data.months.map((month) => ({
              label: monthLabel(month.month),
              net: month.netProduct,
              collected: month.collected,
            }))} />
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg mb-space-lg">
            <Panel title="Giá trị hàng theo loại sản phẩm">
              <HBars rows={data.byProductType.map((row) => ({
                label: typeName(row.productType),
                value: row.merchandise,
                display: formatVnd(row.merchandise),
              }))} />
              <p className="mt-space-sm font-body-md text-body-md text-on-surface-variant">line_total, chưa chia phần giảm giá của cả hoá đơn.</p>
            </Panel>
            <Panel title="AOV theo loại (trên đơn có loại đó)">
              <table className={a.tableCompact}>
                <thead>
                  <tr><th>Loại</th><th className="text-right">Số đơn</th><th className="text-right">AOV loại</th></tr>
                </thead>
                <tbody>
                  {data.byProductType.map((row) => (
                    <tr key={row.productType}>
                      <td>{typeName(row.productType)}</td>
                      <td className="text-right">{row.orders.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{formatVnd(row.aov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg mb-space-lg">
            <Panel title="Phương thức thanh toán">
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
            </Panel>
            <Panel title="Trạng thái thanh toán">
              <table className={a.tableCompact}>
                <thead>
                  <tr><th>Phương thức</th><th>Trạng thái</th><th className="text-right">Số lần</th><th className="text-right">Số tiền</th></tr>
                </thead>
                <tbody>
                  {data.payments.length === 0 && <tr><td colSpan={4}>Không có dữ liệu.</td></tr>}
                  {data.payments.map((slice) => (
                    <tr key={`${slice.method}-${slice.status}`}>
                      <td>{METHOD[slice.method] ?? slice.method}</td>
                      <td>{PAYMENT_STATUS[slice.status] ?? slice.status}</td>
                      <td className="text-right">{slice.count.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{formatVnd(slice.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel title="Hoàn tiền theo lý do">
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Tỷ lệ đơn đã giao có hoàn: {pct(data.refundRatePct)} ({data.refundedOrders.toLocaleString('vi-VN')} / {data.deliveredOrders.toLocaleString('vi-VN')} đơn tạo trong kỳ).
              Bảng dưới là khoản đã chuyển trong kỳ, nhóm theo đúng chữ lý do.
            </p>
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr><th>Loại</th><th>Lý do</th><th className="text-right">Số khoản</th><th className="text-right">Số tiền</th></tr>
                </thead>
                <tbody>
                  {data.refundReasons.length === 0 && <tr><td colSpan={4}>Không có khoản hoàn trong kỳ.</td></tr>}
                  {data.refundReasons.map((row) => (
                    <tr key={`${row.kind}-${row.reason}`}>
                      <td>{KIND[row.kind] ?? row.kind}</td>
                      <td>{row.reason}</td>
                      <td className="text-right">{row.count.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{formatVnd(row.amount)}</td>
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
