import { Link } from 'react-router-dom'

/** What the shop actually does today (shipping fee 0, payment methods, loyalty points, CS tickets). */
const PROMISES = [
  { icon: 'local_shipping', tone: 'bg-primary/10 text-primary', title: 'Miễn Phí Vận Chuyển', desc: 'Áp dụng cho mọi đơn hàng', to: '#goi-y' },
  { icon: 'payments', tone: 'bg-secondary-container/40 text-secondary', title: 'Thanh Toán Linh Hoạt', desc: 'COD hoặc chuyển khoản ngân hàng', to: '/gio-hang' },
  { icon: 'loyalty', tone: 'bg-tertiary-fixed text-tertiary', title: 'Tích Điểm Thành Viên', desc: '1 điểm cho mỗi 10.000đ đơn đã giao', to: '#gamer-club' },
  { icon: 'support_agent', tone: 'bg-surface-container-highest text-on-surface', title: 'Hỗ Trợ Trực Tuyến', desc: 'Gửi yêu cầu, CSKH phản hồi trên web', to: '/ho-tro' },
]

export default function TrustBento() {
  return (
    <section id="cam-ket" className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        {PROMISES.map((item) => {
          const body = (
            <>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${item.tone}`}>
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              </div>
              <div>
                <h4 className="font-title-md text-title-md text-on-surface">{item.title}</h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{item.desc}</p>
              </div>
            </>
          )
          const className = 'flex items-center gap-space-md p-space-xs rounded-lg hover:bg-surface-container-low transition-colors'
          return item.to.startsWith('#')
            ? <a key={item.title} href={item.to} className={className}>{body}</a>
            : <Link key={item.title} to={item.to} className={className}>{body}</Link>
        })}
      </div>
    </section>
  )
}
