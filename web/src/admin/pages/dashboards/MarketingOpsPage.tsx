import { a } from '../../adminUi'
import { formatVnd } from '../../../lib/catalog'
import { RFM_LABEL } from '../../../lib/crm'
import { useReport, type MarketingReport } from './dashboardApi'
import { DashboardFilters } from './dashboardFilters'
import { HBars, Note, Panel, Stats, Status } from './dashboardUi'

function pct(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN')}%`
}

function when(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1971) return 'Không giới hạn'
  return date.toLocaleDateString('vi-VN')
}

export default function MarketingOpsPage() {
  const report = useReport<MarketingReport>('/api/dashboards/marketing')
  const data = report.data

  return (
    <div className={a.formGrid}>
      <div className="col-span-full">
        <h1>Hiệu quả marketing & khuyến mãi</h1>
        <Note>
          Đơn có khuyến mãi là đơn có giảm theo sản phẩm hoặc giảm theo hoá đơn. Voucher không nằm trong phép so sánh này.
          Không tính tỷ lệ voucher đã phát hành. Phễu chiến dịch lấy đơn đã giao trong cửa sổ chiến dịch của người đã nhận thư.
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
            { label: 'Đơn có khuyến mãi', value: data.withPromotion.orders.toLocaleString('vi-VN'), hint: formatVnd(data.withPromotion.revenue) },
            { label: 'Đơn không khuyến mãi', value: data.withoutPromotion.orders.toLocaleString('vi-VN'), hint: formatVnd(data.withoutPromotion.revenue) },
            { label: 'Chi phí giảm giá', value: formatVnd(data.promotionDiscount), hint: data.discountPerPromoOrder == null ? 'Chưa có đơn khuyến mãi' : `${formatVnd(data.discountPerPromoOrder)} / đơn có KM` },
          ]} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
            <Panel title="Doanh thu có và không có khuyến mãi">
              <HBars rows={[
                { label: 'Có khuyến mãi', value: data.withPromotion.revenue, display: formatVnd(data.withPromotion.revenue), color: '#7c3aed' },
                { label: 'Không khuyến mãi', value: data.withoutPromotion.revenue, display: formatVnd(data.withoutPromotion.revenue), color: '#64748b' },
              ]} />
            </Panel>
            <Panel title="Cơ chế giảm">
              <HBars rows={data.mechanisms.map((row) => ({
                label: row.label,
                value: row.orders,
                display: `${row.orders.toLocaleString('vi-VN')} đơn · ${formatVnd(row.discount)}`,
              }))} />
            </Panel>
          </div>

          <Panel title="Flash sale — đã bán / hạn mức">
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th>Chương trình</th><th>Sản phẩm</th><th>SKU</th>
                    <th className="text-right">Đã bán</th><th className="text-right">Hạn mức</th><th>Tỷ lệ</th><th className="text-right">Giá sốc</th>
                  </tr>
                </thead>
                <tbody>
                  {data.flashSales.length === 0 && <tr><td colSpan={7}>Không có flash sale giao với kỳ đang chọn.</td></tr>}
                  {data.flashSales.map((row) => (
                    <tr key={`${row.programName}-${row.sku}`}>
                      <td>{row.programName}</td>
                      <td>{row.productName}</td>
                      <td>{row.sku}</td>
                      <td className="text-right">{row.soldQty.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{row.limitQty == null ? '—' : row.limitQty.toLocaleString('vi-VN')}</td>
                      <td>
                        <div className="min-w-24">
                          <div className="h-2 rounded-full bg-surface-container">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, row.soldPct ?? 0)}%` }} />
                          </div>
                          <span className="font-label-sm text-label-sm">{pct(row.soldPct)}</span>
                        </div>
                      </td>
                      <td className="text-right">{formatVnd(row.flashPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Hiệu quả theo phân khúc RFM">
            <p className="mb-space-md font-body-md text-body-md text-on-surface-variant">
              Đơn có khuyến mãi, nhóm theo phân khúc RFM hiện tại của khách.
            </p>
            <table className={a.tableCompact}>
              <thead>
                <tr><th>Phân khúc</th><th className="text-right">Đơn</th><th className="text-right">Doanh thu</th><th className="text-right">Tiền giảm</th></tr>
              </thead>
              <tbody>
                {data.tiers.map((tier) => (
                  <tr key={tier.tier}>
                    <td>{RFM_LABEL[tier.tier] ?? tier.tier}</td>
                    <td className="text-right">{tier.orders.toLocaleString('vi-VN')}</td>
                    <td className="text-right">{formatVnd(tier.revenue)}</td>
                    <td className="text-right">{formatVnd(tier.discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Voucher đã dùng">
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Mỗi mã là một voucher. Hệ thống không lưu số lượng phát cho từng khách, nên bảng chỉ đếm lần dùng.
            </p>
            <table className={a.tableCompact}>
              <thead>
                <tr><th>Mã</th><th className="text-right">Lần dùng</th><th className="text-right">Số đơn</th></tr>
              </thead>
              <tbody>
                {data.vouchers.length === 0 && <tr><td colSpan={3}>Không có voucher được dùng trong kỳ.</td></tr>}
                {data.vouchers.map((voucher) => (
                  <tr key={voucher.code}>
                    <td>{voucher.code}</td>
                    <td className="text-right">{voucher.uses.toLocaleString('vi-VN')}</td>
                    <td className="text-right">{voucher.orders.toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Phễu chiến dịch">
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
              Nhắm là thành viên phân khúc. Đã gửi và đã đọc lấy thư sent/read, không tính thư scheduled.
              Mua là người nhận thư có đơn đã giao trong cửa sổ chiến dịch. Thiếu ngày kết thúc thì cửa sổ dài 30 ngày.
              Doanh thu không bị cắt lại theo ô ngày ở trên.
            </p>
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th>Chiến dịch</th><th>Cửa sổ</th>
                    <th className="text-right">Nhắm</th><th className="text-right">Đã gửi</th><th className="text-right">Đã đọc</th>
                    <th className="text-right">Mua</th><th className="text-right">Tỷ lệ đọc</th><th className="text-right">Tỷ lệ mua</th>
                    <th className="text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.length === 0 && <tr><td colSpan={9}>Không có chiến dịch giao với kỳ đang chọn.</td></tr>}
                  {data.campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>{campaign.name}</td>
                      <td>{when(campaign.windowFrom)} – {when(campaign.windowTo)}{campaign.assumedEnd ? ' (mặc định 30 ngày)' : ''}</td>
                      <td className="text-right">{campaign.targeted.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{campaign.sent.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{campaign.opened.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{campaign.converted.toLocaleString('vi-VN')}</td>
                      <td className="text-right">{pct(campaign.openRatePct)}</td>
                      <td className="text-right">{pct(campaign.buyRatePct)}</td>
                      <td className="text-right">{formatVnd(campaign.revenue)}</td>
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
