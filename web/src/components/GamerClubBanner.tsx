import { useState } from 'react'

export default function GamerClubBanner() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    alert('Cảm ơn bạn đã tham gia Gamer VIP Club! Mã giảm giá 50K đã được gửi qua email ' + email)
    setEmail('')
  }

  return (
    <section
      id="gamer-club"
      className="rounded-xl bg-gradient-to-r from-inverse-surface via-inverse-surface to-on-surface-variant p-space-xl text-inverse-on-surface shadow-md flex flex-col md:flex-row items-center justify-between gap-space-lg scroll-mt-44"
    >
      <div className="space-y-space-xs max-w-xl">
        <div className="flex items-center gap-space-xs text-primary-fixed">
          <span className="material-symbols-outlined text-xl">redeem</span>
          <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
            Đặc quyền Game Club
          </span>
        </div>
        <h3 className="font-headline-lg text-headline-lg font-bold">
          Đăng Ký Nhận Thông Báo Giảm Giá &amp; Đĩa Mới Ra Mắt
        </h3>
        <p className="font-body-md text-body-md text-surface-dim">
          Nhận ngay mã giảm 50.000₫ cho đơn hàng đầu tiên và thông báo sớm nhất các đợt phát hành đĩa
          game bom tấn giới hạn.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full md:w-auto items-center gap-space-xs">
        <input
          className="px-space-md py-3 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md outline-none w-full md:w-80 shadow-inner"
          placeholder="Nhập địa chỉ email của bạn..."
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="px-space-lg py-3 bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md rounded-lg shadow transition-colors flex-shrink-0 cursor-pointer"
          type="submit"
        >
          {submitted ? 'Đã Đăng Ký' : 'Đăng Ký'}
        </button>
      </form>
    </section>
  )
}
