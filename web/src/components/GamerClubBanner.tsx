import { Link } from 'react-router-dom'
import { LOYALTY_TIERS } from '../lib/loyalty'
import { useAuth } from '../state/AuthContext'

/** Membership programme as it really works: points on delivered orders, four tiers, tier-only vouchers. */
export default function GamerClubBanner() {
  const { isAuthenticated, user } = useAuth()
  const isBuyer = isAuthenticated && user?.role === 'buyer'

  return (
    <section
      id="gamer-club"
      className="rounded-xl bg-gradient-to-r from-inverse-surface via-inverse-surface to-on-surface-variant p-space-xl text-inverse-on-surface shadow-md flex flex-col lg:flex-row items-center justify-between gap-space-lg scroll-mt-44"
    >
      <div className="space-y-space-xs max-w-xl">
        <div className="flex items-center gap-space-xs text-primary-fixed">
          <span className="material-symbols-outlined text-xl">workspace_premium</span>
          <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">Hạng thành viên</span>
        </div>
        <h3 className="font-headline-lg text-headline-lg font-bold">Mua càng nhiều, hạng càng cao</h3>
        <p className="font-body-md text-body-md text-surface-dim">
          Mỗi 10.000đ trên đơn đã giao được 1 điểm. Hạng được xét theo tổng điểm tích luỹ; voucher dành cho
          một hạng áp dụng cho hạng đó và các hạng cao hơn.
        </p>
        <Link
          to={isBuyer ? '/ho-so' : '/dang-nhap'}
          className="inline-flex mt-space-sm px-space-lg py-3 bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md rounded-lg shadow transition-colors"
        >
          {isBuyer ? 'Xem điểm & hạng của tôi' : 'Đăng nhập để tích điểm'}
        </Link>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm w-full lg:w-auto">
        {LOYALTY_TIERS.map((tier) => (
          <li key={tier.code} className="rounded-lg bg-surface-container-lowest/10 border border-surface-dim/20 px-space-md py-space-sm text-center min-w-[7rem]">
            <div className="font-title-lg text-title-lg font-bold">{tier.label}</div>
            <div className="font-label-sm text-label-sm text-surface-dim">
              {tier.minPoints === 0 ? 'Mặc định' : `Từ ${tier.minPoints.toLocaleString('vi-VN')} điểm`}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
