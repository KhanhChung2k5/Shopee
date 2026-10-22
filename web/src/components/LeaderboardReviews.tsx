import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { resolveCatalogImageUrl } from '../lib/catalog'

interface TopSeller {
  productId: string
  name: string
  price: number | null
  soldQuantity: number
  imageUrl: string | null
}

interface ShowcaseReview {
  id: string
  rating: number
  comment: string
  replyText: string | null
  createdAt: string
  buyerName: string | null
  productName: string | null
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Hôm nay'
  if (days < 30) return `${days} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

const DEFAULT_TOP_SELLERS = [
  {
    rank: 1,
    productId: 'sp-d10',
    name: 'EA SPORTS FC 25',
    sub: 'Bản PS5 Vật Lý Sealed',
    price: 1390000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBZFRzlTvpNsuF5fXzIODphTT0dQ9CUfJ1IqXy_O8LrHvGshCAb6wWn0dnRV0UztSWn_uROQNY-x90CZ2pXiuuR7qMttDOWcTk26OAxV1R1JNeuMFD4B2tndV8IXdVEjxGSz3DOb7E2AaLhwvgD2DvD5KQV1N9lXQ0kyxBCxgvJpSJGPen8dtQK2XIYk2-Ef7DIAiCcS3t1EL85Bjxi3Tu-ihR27_rdxLXHbfBiB5erkJHt-NSjPpsT',
    trend: 'up',
  },
  {
    rank: 2,
    productId: 'sp-d5',
    name: 'Black Myth: Wukong',
    sub: 'Hệ US/EU Đĩa Gốc',
    price: 1350000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAM3wUxxiYFEOwbWRpAFVEV9B6iTifVVsUkOgZw2PkGBBSCNwS11J6Z6foW0bFC2j6ZWxf9jJtbWZ6oehj8ZtJ8Olsfbjt54Lf0k4bz8kGKDLprJ-_SZUzblLPzOp2o7Tr38xm-8__NeHa5A3bzmHZzQOBoVaXqlaL_iOOT912cah4yTYGg0ZjSjrkktedFpIQm0PYhJBSdVcABBpfQ3gwiAKCmzfgm4e7o9931zlXvOtNANdA7WJHN',
    trend: 'up',
  },
  {
    rank: 3,
    productId: 'sp-d1',
    name: 'Elden Ring: Shadow of the Erdtree',
    sub: 'Tặng Kèm Art Card Bản Quyền',
    price: 1450000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDT13x_B0t-qQ57U7h_K2J7q4s04bC7N-f1bJm58k55-x9L2zN189fS1qU71Q-qP3lP09eE9eD6b5832uD2kH9rF7aM6eP_Q3fR4xL1zM8oP0qR3kS2uD8aK4hL9jH6rE7fM2eQ',
    trend: 'neutral',
  },
]

const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Trần Quang Huy',
    location: 'Hà Nội • Mua 2 ngày trước',
    comment:
      'Đĩa PS5 Wukong sealed nguyên bọc nilon, tem chính hãng Sony. Đặt hỏa tốc 2 tiếng là shipper giao đến tận bàn. Sẽ tiếp tục ủng hộ Chợ Tốt Mua!',
    photoUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAM3wUxxiYFEOwbWRpAFVEV9B6iTifVVsUkOgZw2PkGBBSCNwS11J6Z6foW0bFC2j6ZWxf9jJtbWZ6oehj8ZtJ8Olsfbjt54Lf0k4bz8kGKDLprJ-_SZUzblLPzOp2o7Tr38xm-8__NeHa5A3bzmHZzQOBoVaXqlaL_iOOT912cah4yTYGg0ZjSjrkktedFpIQm0PYhJBSdVcABBpfQ3gwiAKCmzfgm4e7o9931zlXvOtNANdA7WJHN',
    photoCaption: 'Ảnh unbox thật từ khách hàng',
  },
  {
    id: 'rev-2',
    name: 'Lê Hoàng Long',
    location: 'TP.HCM • Mua hôm qua',
    comment:
      'Tay cầm DualSense Edge cầm đầm tay cực kỳ, cần Hall Effect rê mượt không chút deadzone. Đóng gói 3 lớp bóng khí rất kỹ càng.',
    photoUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNlww-GvuA9PXl2L6YC3hdBiKU_v8ukqp3OMhbGACT-KkkOUEyMlZkArRhRVd6KdbgCCnnmx-uXCP6vlOq3MkzUPxXoZu3MxgQupr6GXzYYL9Qne9MA1vhugpTKJnz_hnmf-FORjSAchZo0ACP2KECR2y9U4yYoX8a3_HcBCSFB-9c0EOQu9gcIsMZE0l57dGGyBg4KUM2UXvg-IyJw2K5CJ1Jxj5peLYcOxys-yz_Zy1RYaTCazsC',
    photoCaption: 'Hộp chống sốc chuẩn sàn',
  },
]

export default function LeaderboardReviews() {
  const [topSellers, setTopSellers] = useState<TopSeller[] | null>(null)
  const [reviews, setReviews] = useState<ShowcaseReview[] | null>(null)

  useEffect(() => {
    let active = true
    apiFetch<TopSeller[]>('/api/products/top-sellers?limit=5')
      .then((items) => { if (active && items.length > 0) setTopSellers(items) })
      .catch(() => {})
    apiFetch<ShowcaseReview[]>('/reviews?limit=4')
      .then((items) => { if (active && items.length > 0) setReviews(items) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length
    : 4.9

  return (
    <section
      id="bxh-danh-gia"
      className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start scroll-mt-44"
    >
      {/* Left Leaderboard (5 Cols) */}
      <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span
              className="material-symbols-outlined text-primary text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              leaderboard
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Top Game Hot Tuần Này</h3>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
            Cập nhật 2H trước
          </span>
        </div>

        <div className="space-y-space-sm">
          {topSellers && topSellers.length > 0 ? (
            topSellers.map((game, index) => {
              const rank = index + 1
              const image = resolveCatalogImageUrl(game.imageUrl, 160)
              return (
                <Link
                  key={game.productId}
                  to={`/san-pham/${game.productId}`}
                  className={`flex items-center gap-space-md p-space-sm rounded-lg transition-colors group ${
                    rank === 1 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container'
                  }`}
                >
                  <span
                    className={`font-headline-md text-headline-md w-6 text-center ${
                      rank === 1 ? 'text-primary font-extrabold' : 'text-on-surface-variant font-bold'
                    }`}
                  >
                    {rank}
                  </span>
                  <div className="w-14 h-14 rounded bg-surface-container-low flex-shrink-0 overflow-hidden">
                    {image && (
                      <div className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform" style={{ backgroundImage: `url('${image}')` }}></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-title-md text-title-md text-on-surface truncate group-hover:text-primary transition-colors">
                      {game.name}
                    </h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Đã bán {game.soldQuantity}</p>
                    {game.price != null && (
                      <span className="font-price-md text-price-md text-primary">
                        ₫{game.price.toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-secondary text-xl">trending_up</span>
                </Link>
              )
            })
          ) : (
            DEFAULT_TOP_SELLERS.map((item) => (
              <a
                key={item.rank}
                href="#goi-y"
                className={`flex items-center gap-space-md p-space-sm rounded-lg transition-colors group ${
                  item.rank === 1 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container'
                }`}
              >
                <span
                  className={`font-headline-md text-headline-md w-6 text-center ${
                    item.rank === 1 ? 'text-primary font-extrabold' : 'text-on-surface-variant font-bold'
                  }`}
                >
                  {item.rank}
                </span>
                <div className="w-14 h-14 rounded bg-surface-container-low flex-shrink-0 overflow-hidden">
                  <div
                    className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform"
                    style={{ backgroundImage: `url('${item.imageUrl}')` }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-title-md text-title-md text-on-surface truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </h4>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{item.sub}</p>
                  <span className="font-price-md text-price-md text-primary">
                    ₫{item.price.toLocaleString('vi-VN')}
                  </span>
                </div>
                {item.trend === 'up' ? (
                  <span className="material-symbols-outlined text-secondary text-xl">trending_up</span>
                ) : (
                  <span className="material-symbols-outlined text-outline-variant text-xl">remove</span>
                )}
              </a>
            ))
          )}
        </div>

        <a
          className="w-full py-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-title-md text-title-md rounded transition-colors flex items-center justify-center gap-1 block text-center"
          href="#goi-y"
        >
          <span>Xem trọn vẹn Bảng Xếp Hạng Doanh Thu</span>
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </a>
      </div>

      {/* Right Testimonials & Community Unbox (7 Cols) */}
      <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Đánh Giá Thực Tế Từ Khách Mua
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Hơn 12.000 game thủ đã tin tưởng đặt mua và giao dịch thành công
            </p>
          </div>
          <span className="flex items-center gap-1 text-primary font-bold font-title-md text-title-md">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            {averageRating.toFixed(1)} / 5.0
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {reviews && reviews.length > 0 ? (
            reviews.map((rev) => {
              const name = rev.buyerName?.trim() || 'Khách hàng'
              return (
                <div
                  key={rev.id}
                  className="bg-surface-container-low p-space-md rounded-lg space-y-space-xs flex flex-col justify-between"
                >
                  <div className="space-y-space-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-title-md text-title-md flex items-center justify-center font-bold">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="font-title-md text-title-md text-on-surface leading-tight">{name}</h5>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">
                            {timeAgo(rev.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm rounded flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        <span>Đã Mua Hàng</span>
                      </span>
                    </div>

                    <div className="flex text-primary text-xs">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className="material-symbols-outlined text-sm"
                          style={star <= rev.rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          star
                        </span>
                      ))}
                    </div>

                    <p className="font-body-md text-body-md text-on-surface italic line-clamp-3">
                      "{rev.comment}"
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            DEFAULT_REVIEWS.map((rev) => (
              <div
                key={rev.id}
                className="bg-surface-container-low p-space-md rounded-lg space-y-space-xs flex flex-col justify-between"
              >
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-title-md text-title-md flex items-center justify-center font-bold">
                        {rev.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="font-title-md text-title-md text-on-surface leading-tight">{rev.name}</h5>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{rev.location}</p>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm rounded flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      <span>Đã Mua Hàng</span>
                    </span>
                  </div>

                  <div className="flex text-primary text-xs">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>

                  <p className="font-body-md text-body-md text-on-surface italic">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-space-xs flex items-center gap-space-xs">
                  <div
                    className="w-12 h-12 rounded bg-cover bg-center border border-outline-variant/30 flex-shrink-0"
                    style={{ backgroundImage: `url('${rev.photoUrl}')` }}
                  ></div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{rev.photoCaption}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
