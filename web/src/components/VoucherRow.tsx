import { useState } from 'react'
import { VOUCHERS } from '../data/sampleProducts'

export default function VoucherRow() {
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  return (
    <section id="vouchers" className="section" aria-labelledby="vouchers-heading">
      <div className="container">
        <h2 id="vouchers-heading" className="section-title section-title--plain">Mã giảm giá dành cho bạn</h2>
        <ul className="voucher-row">
          {VOUCHERS.map((v) => (
            <li key={v.id} className={`voucher-card${v.isShipping ? ' voucher-card--ship' : ''}`}>
              <div className="voucher-card__value">
                {v.isShipping ? (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7h11v9H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 10h4l3 3v3h-7v-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" /><circle cx="17.5" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" /></svg>
                ) : (
                  <span className="voucher-card__amount">{v.amountLabel}</span>
                )}
                <span className="voucher-card__condition">{v.conditionLabel}</span>
              </div>
              <div className="voucher-card__body">
                <p className="voucher-card__name">{v.title}</p>
                <p className="voucher-card__expiry">{v.expiryLabel}</p>
                <button
                  className="button button--outline button--sm voucher-save"
                  type="button"
                  data-saved={Boolean(saved[v.id])}
                  onClick={() => setSaved((s) => ({ ...s, [v.id]: !s[v.id] }))}
                >
                  {saved[v.id] ? 'Đã lưu' : 'Lưu mã'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
