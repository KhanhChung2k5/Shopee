import { a } from '../../adminUi'
import { buttonClass } from '../../../components/ui'
import { formatVnd } from '../../../lib/catalog'
import { RFM_LABEL } from '../../../lib/crm'
import { downloadCsv } from '../../reports'
import { ChartTableSplit } from '../../components/AnalyticsWidgets'
import { useReport, type MarketingReport } from './dashboardApi'
import { DashboardFilters } from './dashboardFilters'
import { HBars, Note, Panel, Stats, Status } from './dashboardUi'

function pct(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN')}%`
}

function when(value: string | null) {
  if (!value) return 'Không giới hạn'
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1971) return 'Không giới hạn'
  return date.toLocaleDateString('vi-VN')
}

function voucherValueLabel(type: string, value: number) {
  if (type === 'percentage') return `Giảm ${value}%`
  return `Giảm ${formatVnd(value)}`
}

export default function MarketingOpsPage() {
  const report = useReport<MarketingReport>('/api/dashboards/marketing')
  const data = report.data

  const totalPromoOrders = (data?.withPromotion.orders ?? 0) + (data?.withoutPromotion.orders ?? 0)
  const totalPromoRev = (data?.withPromotion.revenue ?? 0) + (data?.withoutPromotion.revenue ?? 0)
  const promoShare = totalPromoOrders > 0 ? Math.round(((data?.withPromotion.orders ?? 0) / totalPromoOrders) * 1000) / 10 : null

  const exportVoucherCsv = () => {
    if (!data) return
    downloadCsv(
      `khuyen-mai-voucher_${data.from}_${data.to}.csv`,
      ['Mã voucher', 'Loại giảm', 'Giá trị', 'Lượt dùng', 'Hạn mức', 'Tỷ lệ dùng (%)', 'Số đơn', 'Tiền giảm', 'Doanh thu tạo ra'],
      data.vouchers.map((v) => [
        v.code,
        v.type,
        v.value,
        v.uses,
        v.usageLimit,
        v.redemptionPct,
        v.orders,
        v.discountAmount ?? 0,
        v.revenue ?? 0,
      ]),
    )
  }

  return (
    <div className={a.formGrid}>
      <div className="col-span-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>Thống kê khuyến mãi, voucher & chiến dịch</h1>
          <button type="button" className={buttonClass('secondary', 'sm')} disabled={!data || report.loading} onClick={exportVoucherCsv}>
            Xuất Excel Voucher (CSV)
          </button>
        </div>
        <Note>
          Tổng hợp hiệu quả chương trình khuyến mãi (giảm sản phẩm / giảm hoá đơn / Flash Sale), thống kê chi tiết mã Voucher
          (lượt dùng, tỷ lệ sử dụng hạn mức, tiền giảm và doanh thu tạo ra) và phễu chuyển đổi chiến dịch CRM.
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
            {
              label: 'Đơn có khuyến mãi',
              value: data.withPromotion.orders.toLocaleString('vi-VN'),
              hint: `${formatVnd(data.withPromotion.revenue)}${promoShare != null ? ` · ${promoShare}% tổng đơn` : ''}`,
              tone: 'up',
            },
            {
              label: 'Đơn không khuyến mãi',
              value: data.withoutPromotion.orders.toLocaleString('vi-VN'),
              hint: formatVnd(data.withoutPromotion.revenue),
            },
            {
              label: 'Chi phí giảm giá KM',
              value: formatVnd(data.promotionDiscount),
              hint: data.discountPerPromoOrder == null ? 'Chưa có đơn khuyến mãi' : `${formatVnd(data.discountPerPromoOrder)} / đơn có KM`,
              tone: 'down',
            },
            {
              label: 'Đơn sử dụng Voucher',
              value: (data.voucherOrders ?? 0).toLocaleString('vi-VN'),
              hint: `Doanh thu ${formatVnd(data.voucherRevenue ?? 0)}`,
              tone: 'up',
            },
            {
              label: 'Tổng tiền giảm từ Voucher',
              value: formatVnd(data.voucherDiscount ?? 0),
              hint: `${data.vouchers.length} mã voucher có lượt dùng trong kỳ`,
            },
          ]} />

          {/* 1. So sánh Có KM vs Không KM: Chart + Table kế bên */}
          <Panel title="So sánh doanh thu có và không có khuyến mãi">
            <ChartTableSplit
              chart={
                <HBars rows={[
                  { label: 'Có khuyến mãi', value: data.withPromotion.revenue, display: formatVnd(data.withPromotion.revenue), color: '#7c3aed' },
                  { label: 'Không khuyến mãi', value: data.withoutPromotion.revenue, display: formatVnd(data.withoutPromotion.revenue), color: '#64748b' },
                ]} />
              }
              table={
                <div className={a.tableWrap}>
                  <table className={a.tableCompact}>
                    <thead>
                      <tr>
                        <th>Nhóm đơn</th>
                        <th className="!text-right">Số đơn</th>
                        <th className="!text-right">Tỷ trọng đơn</th>
                        <th className="!text-right">Doanh thu</th>
                        <th className="!text-right">AOV</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-medium">Có khuyến mãi</td>
                        <td className="text-right tabular-nums">{data.withPromotion.orders.toLocaleString('vi-VN')}</td>
                        <td className="text-right tabular-nums">{pct(promoShare)}</td>
                        <td className="text-right tabular-nums font-semibold">{formatVnd(data.withPromotion.revenue)}</td>
                        <td className="text-right tabular-nums">
                          {data.withPromotion.orders > 0 ? formatVnd(Math.round(data.withPromotion.revenue / data.withPromotion.orders)) : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-medium">Không khuyến mãi</td>
                        <td className="text-right tabular-nums">{data.withoutPromotion.orders.toLocaleString('vi-VN')}</td>
                        <td className="text-right tabular-nums">
                          {totalPromoOrders > 0 ? pct(Math.round((data.withoutPromotion.orders / totalPromoOrders) * 1000) / 10) : '—'}
                        </td>
                        <td className="text-right tabular-nums font-semibold">{formatVnd(data.withoutPromotion.revenue)}</td>
                        <td className="text-right tabular-nums">
                          {data.withoutPromotion.orders > 0 ? formatVnd(Math.round(data.withoutPromotion.revenue / data.withoutPromotion.orders)) : '—'}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-line bg-surface-container-low/60 font-bold">
                        <td>Tổng cộng</td>
                        <td className="text-right tabular-nums">{totalPromoOrders.toLocaleString('vi-VN')}</td>
                        <td className="text-right tabular-nums">100%</td>
                        <td className="text-right tabular-nums">{formatVnd(totalPromoRev)}</td>
                        <td className="text-right tabular-nums">
                          {totalPromoOrders > 0 ? formatVnd(Math.round(totalPromoRev / totalPromoOrders)) : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          {/* 2. Cơ chế khuyến mãi: Chart + Table kế bên */}
          <Panel title="Hiệu quả theo cơ chế giảm giá">
            <ChartTableSplit
              chart={
                <HBars rows={data.mechanisms.map((row) => ({
                  label: row.label,
                  value: row.revenue,
                  display: `${formatVnd(row.revenue)} (${row.orders.toLocaleString('vi-VN')} đơn)`,
                  color: row.key === 'product' ? '#0284c7' : row.key === 'invoice' ? '#16a34a' : '#7c3aed',
                }))} />
              }
              table={
                <div className={a.tableWrap}>
                  <table className={a.tableCompact}>
                    <thead>
                      <tr>
                        <th>Cơ chế giảm</th>
                        <th className="!text-right">Số đơn</th>
                        <th className="!text-right">Doanh thu</th>
                        <th className="!text-right">Tiền giảm</th>
                        <th className="!text-right">Giảm / DT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mechanisms.map((row) => {
                        const rate = row.revenue > 0 ? Math.round((row.discount / row.revenue) * 1000) / 10 : null
                        return (
                          <tr key={row.key}>
                            <td className="font-medium">{row.label}</td>
                            <td className="text-right tabular-nums">{row.orders.toLocaleString('vi-VN')}</td>
                            <td className="text-right tabular-nums font-semibold">{formatVnd(row.revenue)}</td>
                            <td className="text-right tabular-nums text-red-600">{formatVnd(row.discount)}</td>
                            <td className="text-right tabular-nums">{pct(rate)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          {/* 3. Thống kê Voucher chi tiết: Chart + Table kế bên */}
          <Panel title="Thống kê hiệu quả mã Voucher">
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Xếp hạng các mã voucher có lượt sử dụng trong kỳ kèm tỷ lệ sử dụng so với hạn mức, tiền giảm và doanh thu đơn hàng mang lại.
            </p>
            <ChartTableSplit
              chartRatio="0.85fr"
              chart={
                data.vouchers.length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant">Không có voucher nào được sử dụng trong kỳ.</p>
                ) : (
                  <HBars rows={data.vouchers.slice(0, 8).map((v) => ({
                    label: `${v.code} (${voucherValueLabel(v.type, v.value)})`,
                    value: v.revenue,
                    display: `${formatVnd(v.revenue)} · ${v.uses} lượt`,
                    color: '#ea580c',
                  }))} />
                )
              }
              table={
                <div className={a.tableWrap}>
                  <table className={a.tableCompact}>
                    <thead>
                      <tr>
                        <th>Mã voucher</th>
                        <th>Mức giảm</th>
                        <th className="!text-right">Lượt / Hạn mức</th>
                        <th>Tỷ lệ dùng</th>
                        <th className="!text-right">Tiền giảm</th>
                        <th className="!text-right">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vouchers.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-on-surface-variant">Không có voucher được dùng trong kỳ.</td></tr>
                      )}
                      {data.vouchers.map((voucher) => (
                        <tr key={voucher.code}>
                          <td>
                            <div className="font-bold">{voucher.code}</div>
                            <small className="text-on-surface-variant">HSD: {when(voucher.expiresAt)}</small>
                          </td>
                          <td>{voucherValueLabel(voucher.type, voucher.value)}</td>
                          <td className="text-right tabular-nums">
                            <strong>{voucher.uses.toLocaleString('vi-VN')}</strong>
                            <span className="text-on-surface-variant">
                              {' / '}
                              {voucher.usageLimit == null ? '∞' : voucher.usageLimit.toLocaleString('vi-VN')}
                            </span>
                          </td>
                          <td>
                            {voucher.redemptionPct == null ? (
                              <span className="text-on-surface-variant">—</span>
                            ) : (
                              <div className="min-w-20">
                                <div className="h-2 rounded-full bg-surface-container">
                                  <div className="h-2 rounded-full bg-[#ea580c]" style={{ width: `${Math.min(100, voucher.redemptionPct)}%` }} />
                                </div>
                                <span className="font-label-sm text-label-sm tabular-nums">{pct(voucher.redemptionPct)}</span>
                              </div>
                            )}
                          </td>
                          <td className="text-right tabular-nums text-red-600">{formatVnd(voucher.discountAmount ?? 0)}</td>
                          <td className="text-right tabular-nums font-semibold">{formatVnd(voucher.revenue ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          {/* 4. Flash sale */}
          <Panel title="Flash sale — đã bán / hạn mức">
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th>Chương trình</th><th>Sản phẩm</th><th>SKU</th>
                    <th className="!text-right">Đã bán</th><th className="!text-right">Hạn mức</th><th>Tỷ lệ</th><th className="!text-right">Giá sốc</th>
                  </tr>
                </thead>
                <tbody>
                  {data.flashSales.length === 0 && <tr><td colSpan={7}>Không có flash sale giao với kỳ đang chọn.</td></tr>}
                  {data.flashSales.map((row) => (
                    <tr key={`${row.programName}-${row.sku}`}>
                      <td>{row.programName}</td>
                      <td>{row.productName}</td>
                      <td>{row.sku}</td>
                      <td className="text-right tabular-nums">{row.soldQty.toLocaleString('vi-VN')}</td>
                      <td className="text-right tabular-nums">{row.limitQty == null ? '—' : row.limitQty.toLocaleString('vi-VN')}</td>
                      <td>
                        <div className="min-w-24">
                          <div className="h-2 rounded-full bg-surface-container">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, row.soldPct ?? 0)}%` }} />
                          </div>
                          <span className="font-label-sm text-label-sm tabular-nums">{pct(row.soldPct)}</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums font-semibold">{formatVnd(row.flashPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* 5. Hiệu quả theo phân khúc RFM: Chart + Table kế bên */}
          <Panel title="Hiệu quả khuyến mãi theo phân khúc RFM">
            <ChartTableSplit
              chart={
                <HBars rows={data.tiers.filter((t) => t.orders > 0).map((t) => ({
                  label: RFM_LABEL[t.tier] ?? t.tier,
                  value: t.revenue,
                  display: `${formatVnd(t.revenue)} (${t.orders} đơn)`,
                  color: '#0d9488',
                }))} />
              }
              table={
                <div className={a.tableWrap}>
                  <table className={a.tableCompact}>
                    <thead>
                      <tr><th>Phân khúc</th><th className="!text-right">Đơn</th><th className="!text-right">Doanh thu</th><th className="!text-right">Tiền giảm</th></tr>
                    </thead>
                    <tbody>
                      {data.tiers.map((tier) => (
                        <tr key={tier.tier}>
                          <td className="font-medium">{RFM_LABEL[tier.tier] ?? tier.tier}</td>
                          <td className="text-right tabular-nums">{tier.orders.toLocaleString('vi-VN')}</td>
                          <td className="text-right tabular-nums font-semibold">{formatVnd(tier.revenue)}</td>
                          <td className="text-right tabular-nums text-red-600">{formatVnd(tier.discount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          </Panel>

          {/* 6. Phễu chiến dịch */}
          <Panel title="Phễu chiến dịch">
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Nhắm là thành viên phân khúc. Đã gửi và đã đọc lấy thư sent/read, không tính thư scheduled.
              Mua là người nhận thư có đơn đã giao trong cửa sổ chiến dịch. Thiếu ngày kết thúc thì cửa sổ dài 30 ngày.
            </p>
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th>Chiến dịch</th><th>Cửa sổ</th>
                    <th className="!text-right">Nhắm</th><th className="!text-right">Đã gửi</th><th className="!text-right">Đã đọc</th>
                    <th className="!text-right">Mua</th><th className="!text-right">Tỷ lệ đọc</th><th className="!text-right">Tỷ lệ mua</th>
                    <th className="!text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.length === 0 && <tr><td colSpan={9}>Không có chiến dịch giao với kỳ đang chọn.</td></tr>}
                  {data.campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="font-medium">{campaign.name}</td>
                      <td>{when(campaign.windowFrom)} – {when(campaign.windowTo)}{campaign.assumedEnd ? ' (mặc định 30 ngày)' : ''}</td>
                      <td className="text-right tabular-nums">{campaign.targeted.toLocaleString('vi-VN')}</td>
                      <td className="text-right tabular-nums">{campaign.sent.toLocaleString('vi-VN')}</td>
                      <td className="text-right tabular-nums">{campaign.opened.toLocaleString('vi-VN')}</td>
                      <td className="text-right tabular-nums">{campaign.converted.toLocaleString('vi-VN')}</td>
                      <td className="text-right tabular-nums">{pct(campaign.openRatePct)}</td>
                      <td className="text-right tabular-nums">{pct(campaign.buyRatePct)}</td>
                      <td className="text-right tabular-nums font-semibold">{formatVnd(campaign.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
