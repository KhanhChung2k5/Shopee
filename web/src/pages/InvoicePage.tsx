import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { formatVnd } from '../lib/catalog'
import { fetchOrderInvoices, invoiceDate, type Invoice, type OrderInvoices } from '../lib/invoices'
import { useAuth } from '../state/AuthContext'

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']

/** Three digits in words; `full` reads leading zeros ("không trăm lẻ năm") as inside a bigger number. */
function readTriple(n: number, full: boolean): string {
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const u = n % 10
  const words: string[] = []
  if (full || h > 0) words.push(`${DIGITS[h]} trăm`)
  if (t === 0 && u === 0) return words.join(' ')
  if (t === 0) {
    if (full || h > 0) words.push('lẻ')
    words.push(DIGITS[u])
  } else if (t === 1) {
    words.push(u === 5 ? 'mười lăm' : u > 0 ? `mười ${DIGITS[u]}` : 'mười')
  } else {
    words.push(`${DIGITS[t]} mươi`)
    if (u === 1) words.push('mốt')
    else if (u === 4) words.push('tư')
    else if (u === 5) words.push('lăm')
    else if (u > 0) words.push(DIGITS[u])
  }
  return words.join(' ')
}

/** "Một triệu một trăm nghìn đồng" — the amount in words printed on Vietnamese invoices. */
export function vndInWords(amount: number): string {
  let n = Math.round(Math.abs(amount))
  if (n === 0) return 'Không đồng'
  const groups: number[] = []
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    parts.push(`${readTriple(groups[i], i < groups.length - 1)} ${GROUP_UNITS[i]}`.trim())
  }
  const text = parts.join(' ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`
}

const PAYMENT: Record<string, string> = { cod: 'Tiền mặt khi nhận hàng (COD)', bank_transfer: 'Chuyển khoản' }

function attributesText(raw: string | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const text = Object.entries(parsed).map(([k, v]) => `${k}: ${String(v)}`).join(', ')
    return text || null
  } catch {
    return raw
  }
}

/** /hoa-don/:orderId — the order's invoice laid out for printing (buyer: own orders; staff: any order). */
export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { token, isAuthenticated, isReady, user } = useAuth()
  const [data, setData] = useState<OrderInvoices | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCancelled, setShowCancelled] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !orderId) return
    fetchOrderInvoices(token, orderId)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được hoá đơn'))
  }, [token, orderId])

  if (!isReady) return null
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: `/hoa-don/${orderId}` }} />

  const back = user?.role === 'staff' ? `/admin/don-hang/${orderId}` : `/don-hang/${orderId}`
  const shown: Invoice | null = data
    ? (showCancelled ? data.cancelled.find((i) => i.id === showCancelled) ?? null : data.current)
    : null

  return (
    <div className="min-h-screen bg-surface-container-low py-space-lg print:bg-white print:py-0">
      <div className="mx-auto max-w-[820px] px-4 space-y-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-sm print:hidden">
          <Link to={back} className="font-title-md text-title-md text-primary hover:underline">← Quay lại đơn hàng</Link>
          <div className="flex flex-wrap items-center gap-space-sm">
            {data && data.cancelled.length > 0 && (
              <select className="rounded-lg border border-line bg-surface-container-lowest px-space-sm py-1.5 font-body-md text-body-md"
                value={showCancelled ?? ''} onChange={(e) => setShowCancelled(e.target.value || null)} aria-label="Chọn hoá đơn">
                <option value="">Hoá đơn hiện hành</option>
                {data.cancelled.map((i) => <option key={i.id} value={i.id}>{i.invoiceNo} (đã huỷ)</option>)}
              </select>
            )}
            {shown && (
              <button type="button" onClick={() => window.print()}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-space-md py-2 font-title-md text-title-md text-on-primary cursor-pointer hover:bg-primary-container">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">print</span>In hoá đơn
              </button>
            )}
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl bg-surface-container-lowest p-space-lg font-body-md text-body-md text-error">{error}</p>}
        {!error && !data && <p className="rounded-xl bg-surface-container-lowest p-space-lg font-body-md text-body-md">Đang tải hoá đơn…</p>}
        {data && !shown && (
          <p className="rounded-xl bg-surface-container-lowest p-space-lg font-body-md text-body-md text-on-surface-variant">
            Đơn hàng chưa có hoá đơn. Hoá đơn được lập tự động khi đơn đã giao và đã thanh toán.
          </p>
        )}

        {shown && (
          <article className="relative overflow-hidden rounded-xl bg-white p-space-xl text-[#111] shadow-sm print:rounded-none print:p-0 print:shadow-none">
            {shown.status === 'cancelled' && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rotate-[-25deg] border-4 border-[#c62828] px-space-lg py-2 text-5xl font-extrabold tracking-widest text-[#c62828] opacity-30">ĐÃ HUỶ</span>
              </div>
            )}
            <header className="flex flex-wrap items-start justify-between gap-space-md border-b-2 border-[#111] pb-space-md">
              <div>
                <div className="text-xl font-extrabold">CÔNG TY TNHH THƯƠNG MẠI CHỢ TỐT MUA</div>
                <div className="text-sm">Bán lẻ thiết bị chơi game · TP. Hồ Chí Minh</div>
              </div>
              <div className="text-right text-sm">
                <div>Số: <strong className="text-base">{shown.invoiceNo}</strong></div>
                <div>Ngày lập: {invoiceDate(shown.issuedAt)}</div>
                <div>Đơn hàng: #{shown.orderId.slice(0, 8).toUpperCase()}</div>
              </div>
            </header>

            <h1 className="my-space-lg text-center text-2xl font-extrabold tracking-wide">HOÁ ĐƠN BÁN HÀNG</h1>
            {shown.status === 'cancelled' && (
              <p className="mb-space-md text-center text-sm text-[#c62828]">
                Đã huỷ ngày {shown.cancelledAt ? invoiceDate(shown.cancelledAt) : ''}{shown.cancelReason ? ` — ${shown.cancelReason}` : ''}
              </p>
            )}

            <dl className="grid grid-cols-[170px_1fr] gap-y-1 text-sm">
              <dt>Người mua hàng:</dt><dd className="font-semibold">{shown.buyerName}</dd>
              {shown.buyerCompany && <><dt>Tên đơn vị:</dt><dd className="font-semibold">{shown.buyerCompany}</dd></>}
              {shown.buyerTaxCode && <><dt>Mã số thuế:</dt><dd>{shown.buyerTaxCode}</dd></>}
              <dt>Địa chỉ:</dt><dd>{shown.buyerAddress ?? '—'}</dd>
              <dt>Điện thoại / Email:</dt><dd>{[shown.buyerPhone, shown.buyerEmail].filter(Boolean).join(' · ') || '—'}</dd>
              <dt>Hình thức thanh toán:</dt><dd>{shown.paymentMethod ? PAYMENT[shown.paymentMethod] ?? shown.paymentMethod : '—'}</dd>
            </dl>

            <table className="mt-space-lg w-full border-collapse text-sm [&_td]:border [&_td]:border-[#999] [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-[#999] [&_th]:bg-[#f2f2f2] [&_th]:px-2 [&_th]:py-1.5">
              <thead>
                <tr><th className="w-10">STT</th><th className="text-left">Tên hàng hoá</th><th className="w-14">ĐVT</th><th className="w-14">SL</th><th className="w-28 text-right">Đơn giá</th><th className="w-32 text-right">Thành tiền</th></tr>
              </thead>
              <tbody>
                {shown.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="text-center">{i + 1}</td>
                    <td>{line.productName}{attributesText(line.attributes) && <div className="text-xs text-[#555]">{attributesText(line.attributes)}</div>}</td>
                    <td className="text-center">Cái</td>
                    <td className="text-center">{line.quantity}</td>
                    <td className="text-right">{formatVnd(line.unitPrice)}</td>
                    <td className="text-right">{formatVnd(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto mt-space-md w-full max-w-[380px] space-y-1 text-sm">
              {[
                ['Cộng tiền hàng', formatVnd(shown.goodsAmount)],
                ['Giảm giá', `− ${formatVnd(shown.discountAmount)}`],
                ['Phí vận chuyển', formatVnd(shown.shippingFeeAmount)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between"><span>{label}</span><span>{value}</span></div>
              ))}
              <div className="flex justify-between border-t border-[#999] pt-1 text-base font-extrabold"><span>Tổng thanh toán</span><span>{formatVnd(shown.totalAmount)}</span></div>
              <div className="flex justify-between text-[#444]"><span>Trong đó: tiền hàng chưa thuế</span><span>{formatVnd(shown.preTaxAmount)}</span></div>
              <div className="flex justify-between text-[#444]"><span>Thuế GTGT ({shown.vatRate}%)</span><span>{formatVnd(shown.vatAmount)}</span></div>
            </div>
            <p className="mt-space-md text-sm">Số tiền viết bằng chữ: <em>{vndInWords(shown.totalAmount)}</em>.</p>

            <footer className="mt-space-xl grid grid-cols-2 text-center text-sm">
              <div><strong>Người mua hàng</strong><div className="text-xs italic">(Ký, ghi rõ họ tên)</div></div>
              <div><strong>Người bán hàng</strong><div className="text-xs italic">Chợ Tốt Mua — lập tự động trên hệ thống</div></div>
            </footer>
          </article>
        )}
      </div>
    </div>
  )
}
