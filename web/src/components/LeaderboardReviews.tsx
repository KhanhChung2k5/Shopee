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

export default function LeaderboardReviews() {
  const [topSellers, setTopSellers] = useState<TopSeller[] | null>(null)
  const [reviews, setReviews] = useState<ShowcaseReview[] | null>(null)

  useEffect(() => {
    let active = true
    apiFetch<TopSeller[]>('/api/products/top-sellers?limit=5')
      .then((items) => { if (active) setTopSellers(items) })
      .catch(() => { if (active) setTopSellers([]) })
    apiFetch<ShowcaseReview[]>('/reviews?limit=4')
      .then((items) => { if (active) setReviews(items) })
      .catch(() => { if (active) setReviews([]) })
    return () => { active = false }
  }, [])


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
            <h3 className="font-headline-md text-headline-md text-on-surface">Bán Chạy Nhất</h3>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
            Theo số lượng đã bán
          </span>
        </div>

        <div className="space-y-space-sm">
          {topSellers && topSellers.length > 0 ? (
            topSellers.map((game, index) => {
              const rank = index + 1
              const image = resolveCatalogImageUrl(game.imageUrl)
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
            <p className="font-body-md text-body-md text-on-surface-variant py-space-md text-center">
              {topSellers ? 'Chưa có đơn hàng nào để xếp hạng.' : 'Đang tải…'}
            </p>
          )}
        </div>

        <a
          className="w-full py-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-title-md text-title-md rounded transition-colors flex items-center justify-center gap-1 block text-center"
          href="#goi-y"
        >
          <span>Xem tất cả sản phẩm</span>
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
              Đánh giá 4–5 sao gần nhất từ khách đã nhận hàng
            </p>
          </div>
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
            <p className="md:col-span-2 font-body-md text-body-md text-on-surface-variant py-space-md text-center">
              {reviews ? 'Chưa có đánh giá nào. Đánh giá sẽ hiện ở đây sau khi khách nhận hàng và chấm sao.' : 'Đang tải…'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
