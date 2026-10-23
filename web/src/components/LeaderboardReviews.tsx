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
    productId: 'ed6de72d-7afd-5f30-bd3a-e4ad9db6411e',
    name: 'Đĩa PS5 Astro Bot',
    sub: 'Bản Đĩa PS5 Chính Hãng Sealed',
    price: 1499000,
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d4-1.webp',
    trend: 'up',
  },
  {
    rank: 2,
    productId: 'eb538024-56e6-5134-aef6-927c163ac9aa',
    name: 'Đĩa PS5 Stellar Blade',
    sub: 'Bản Đĩa PS5 Chính Hãng Sealed',
    price: 1799000,
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d5-1.webp',
    trend: 'up',
  },
  {
    rank: 3,
    productId: '0a13b6d2-1e8a-51c3-91c8-310351af0c60',
    name: 'Tay Cầm DualSense Edge',
    sub: 'Tay Cầm Pro Cao Cấp Cho PS5',
    price: 5699000,
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-c5-1.webp',
    trend: 'up',
  },
]

const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Trần Quang Huy',
    location: 'Hà Nội • Mua 2 ngày trước',
    comment:
      'Đĩa PS5 Astro Bot sealed nguyên bọc nilon, tem chính hãng Sony. Đặt hỏa tốc 2 tiếng là shipper giao đến tận bàn. Game chơi quá hay và mượt mà!',
    photoUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d4-1.webp',
    photoCaption: 'Ảnh unbox thật từ khách hàng',
  },
  {
    id: 'rev-2',
    name: 'Lê Hoàng Long',
    location: 'TP.HCM • Mua hôm qua',
    comment:
      'Tay cầm DualSense Edge cầm đầm tay cực kỳ, nút gạt trigger và phím sau lưng siêu nhạy. Đóng gói 3 lớp bóng khí rất kỹ càng.',
    photoUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-c5-1.webp',
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
