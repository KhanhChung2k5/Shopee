// Sample/mock catalog data for the actual business: a retailer of game
// controllers and game discs. Mirrors the Product fields added in the
// class diagram v9 (productType, platforms, publisher, genre, ageRating,
// releaseDate, connectionType, warrantyMonths) so both web and mobile
// (mobile_app/lib/data/sample_data.dart) read the same shape once a real
// Catalog API exists (Phase 2).
export type ProductType = 'game_disc' | 'controller' | 'accessory'
export type ConnectionType = 'wired' | 'wireless' | 'bluetooth'

export interface Product {
  id: string
  name: string
  price: number
  comparePrice: number
  rating?: number
  soldLabel?: string
  soldCount?: number
  limitCount?: number
  thumbSeed: number
  productType: ProductType
  platforms?: string[]
  publisher?: string
  genre?: string
  ageRating?: string
  connectionType?: ConnectionType
  warrantyMonths?: number
  /** One of CATEGORIES[].label — the primary category shown in nav/filtering. */
  category: string
}

export function categorySlug(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function discountPercent(price: number, comparePrice: number) {
  return Math.round((1 - price / comparePrice) * 100)
}

export function formatVnd(value: number) {
  return '₫' + value.toLocaleString('vi-VN')
}

export const CONNECTION_LABELS: Record<ConnectionType, string> = {
  wired: 'Có dây',
  wireless: 'Không dây',
  bluetooth: 'Bluetooth',
}

export const SUGGESTED_PRODUCTS: Product[] = [
  { id: 'sp-1', name: 'Đĩa game đua xe tốc độ cao - bản Standard', price: 690000, comparePrice: 990000, rating: 4.8, soldLabel: '2.3k', thumbSeed: 0, productType: 'game_disc', platforms: ['PS5'], publisher: 'SpeedWorks Studio', genre: 'Đua xe', ageRating: '3+', category: 'Đĩa game PS5' },
  { id: 'sp-2', name: 'Đĩa game phiêu lưu hành động thế giới mở', price: 990000, comparePrice: 1290000, rating: 4.7, soldLabel: '5.1k', thumbSeed: 1, productType: 'game_disc', platforms: ['Xbox Series X'], publisher: 'Horizon Interactive', genre: 'Hành động', ageRating: '16+', category: 'Đĩa game Xbox' },
  { id: 'sp-3', name: 'Đĩa game bóng đá mùa giải 2026', price: 890000, comparePrice: 1290000, rating: 4.9, soldLabel: '1.2k', thumbSeed: 2, productType: 'game_disc', platforms: ['PS5', 'PS4'], publisher: 'GoalLine Games', genre: 'Thể thao', ageRating: '3+', category: 'Đĩa game PS5' },
  { id: 'sp-4', name: 'Đĩa game bắn súng chiến thuật online', price: 759000, comparePrice: 990000, rating: 4.6, soldLabel: '890', thumbSeed: 3, productType: 'game_disc', platforms: ['PC'], publisher: 'TacOps Studio', genre: 'Bắn súng', ageRating: '18+', category: 'Đĩa game PC' },
  { id: 'sp-5', name: 'Đĩa game nhập vai giả tưởng sử thi', price: 675000, comparePrice: 890000, rating: 4.8, soldLabel: '3.4k', thumbSeed: 4, productType: 'game_disc', platforms: ['Nintendo Switch'], publisher: 'Mythwood', genre: 'Nhập vai', ageRating: '12+', category: 'Đĩa game Switch' },
  { id: 'sp-6', name: 'Tay cầm DualSense không dây màu Techno Red cho PS5', price: 1590000, comparePrice: 1890000, rating: 4.7, soldLabel: '660', thumbSeed: 5, productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', warrantyMonths: 12, category: 'Tay cầm PS5' },
  { id: 'sp-7', name: 'Tay cầm có dây giá rẻ cho PC/Android', price: 259000, comparePrice: 399000, rating: 4.5, soldLabel: '1.8k', thumbSeed: 0, productType: 'controller', platforms: ['PC', 'Android'], connectionType: 'wired', warrantyMonths: 6, category: 'Tay cầm Switch/PC' },
  { id: 'sp-8', name: 'Tay cầm chính hãng cho Xbox One', price: 1290000, comparePrice: 1590000, rating: 4.9, soldLabel: '4.2k', thumbSeed: 1, productType: 'controller', platforms: ['Xbox One'], connectionType: 'wireless', warrantyMonths: 12, category: 'Tay cầm Xbox' },
  { id: 'sp-9', name: 'Cặp Joy-Con thay thế cho Nintendo Switch', price: 990000, comparePrice: 1290000, rating: 4.6, soldLabel: '7.6k', thumbSeed: 2, productType: 'controller', platforms: ['Nintendo Switch'], connectionType: 'wireless', warrantyMonths: 6, category: 'Tay cầm Switch/PC' },
  { id: 'sp-10', name: 'Bộ 2 tay cầm kèm hộp sạc cho PS4', price: 1090000, comparePrice: 1490000, rating: 4.8, soldLabel: '980', thumbSeed: 3, productType: 'controller', platforms: ['PS4'], connectionType: 'wireless', warrantyMonths: 12, category: 'Tay cầm PS4' },
  { id: 'sp-11', name: 'Đĩa game kinh dị sinh tồn', price: 590000, comparePrice: 790000, rating: 4.7, soldLabel: '1.1k', thumbSeed: 4, productType: 'game_disc', platforms: ['PS5'], publisher: 'Nightfall Games', genre: 'Kinh dị', ageRating: '18+', category: 'Đĩa game PS5' },
  { id: 'sp-12', name: 'Đĩa game giải đố sáng tạo cho gia đình', price: 450000, comparePrice: 590000, rating: 4.9, soldLabel: '2.7k', thumbSeed: 5, productType: 'game_disc', platforms: ['Nintendo Switch'], publisher: 'Puzzlebox', genre: 'Giải đố', ageRating: '3+', category: 'Đĩa game Switch' },
  { id: 'sp-13', name: 'Ốp silicon chống trượt cho tay cầm PS5', price: 79000, comparePrice: 119000, rating: 4.6, soldLabel: '1.5k', thumbSeed: 0, productType: 'accessory', platforms: ['PS5'], warrantyMonths: 3, category: 'Phụ kiện tay cầm' },
  { id: 'sp-14', name: 'Tai nghe gaming không dây chống ồn', price: 890000, comparePrice: 1290000, rating: 4.7, soldLabel: '760', thumbSeed: 1, productType: 'accessory', platforms: ['PS5', 'Xbox Series X', 'PC'], connectionType: 'wireless', warrantyMonths: 12, category: 'Tai nghe gaming' },
  { id: 'sp-15', name: 'Đĩa game chiến thuật thời gian thực', price: 525000, comparePrice: 690000, rating: 4.8, soldLabel: '1.4k', thumbSeed: 2, productType: 'game_disc', platforms: ['PC'], publisher: 'Vanguard Tactics', genre: 'Chiến thuật', ageRating: '12+', category: 'Đĩa game PC' },
  { id: 'sp-16', name: 'Cáp sạc tay cầm dài 3m chống đứt', price: 79000, comparePrice: 129000, rating: 4.7, soldLabel: '3.9k', thumbSeed: 3, productType: 'accessory', warrantyMonths: 6, category: 'Phụ kiện tay cầm' },
  { id: 'sp-17', name: 'Giá đỡ treo tường cho tay cầm & tai nghe', price: 189000, comparePrice: 259000, rating: 4.8, soldLabel: '610', thumbSeed: 4, productType: 'accessory', category: 'Phụ kiện tay cầm' },
  { id: 'sp-18', name: 'Túi đựng tay cầm chống sốc du lịch', price: 129000, comparePrice: 189000, rating: 4.5, soldLabel: '2.1k', thumbSeed: 5, productType: 'accessory', category: 'Phụ kiện tay cầm' },
  { id: 'sp-19', name: 'Pin sạc dự phòng cho tay cầm Xbox', price: 249000, comparePrice: 349000, rating: 4.9, soldLabel: '540', thumbSeed: 0, productType: 'accessory', platforms: ['Xbox Series X', 'Xbox One'], warrantyMonths: 6, category: 'Phụ kiện tay cầm' },
  { id: 'sp-20', name: 'Miếng dán cần analog chống trượt (grip caps)', price: 45000, comparePrice: 69000, rating: 4.6, soldLabel: '1.3k', thumbSeed: 1, productType: 'accessory', category: 'Phụ kiện tay cầm' },
]

export const FLASH_SALE_PRODUCTS: Product[] = [
  { id: 'fs-1', name: 'Tay cầm DualSense không dây chính hãng cho PS5', price: 1390000, comparePrice: 1890000, soldCount: 68, limitCount: 100, thumbSeed: 2, productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', warrantyMonths: 12, category: 'Tay cầm PS5' },
  { id: 'fs-2', name: 'Tay cầm có dây cho Xbox Series X/S', price: 990000, comparePrice: 1390000, soldCount: 91, limitCount: 100, thumbSeed: 1, productType: 'controller', platforms: ['Xbox Series X', 'Xbox Series S'], connectionType: 'wired', warrantyMonths: 12, category: 'Tay cầm Xbox' },
  { id: 'fs-3', name: 'Tay cầm Pro chống trượt cho Nintendo Switch', price: 890000, comparePrice: 1290000, soldCount: 45, limitCount: 100, thumbSeed: 4, productType: 'controller', platforms: ['Nintendo Switch'], connectionType: 'wireless', warrantyMonths: 12, category: 'Tay cầm Switch/PC' },
  { id: 'fs-4', name: 'Tay cầm đa nền tảng Bluetooth (PS4/PC/Android)', price: 359000, comparePrice: 590000, soldCount: 82, limitCount: 100, thumbSeed: 0, productType: 'controller', platforms: ['PS4', 'PC', 'Android'], connectionType: 'bluetooth', warrantyMonths: 6, category: 'Tay cầm PS4' },
  { id: 'fs-5', name: 'Bộ sạc đôi cho tay cầm PS5', price: 259000, comparePrice: 399000, soldCount: 97, limitCount: 100, thumbSeed: 3, productType: 'accessory', platforms: ['PS5'], connectionType: 'wired', warrantyMonths: 6, category: 'Phụ kiện tay cầm' },
  { id: 'fs-6', name: 'Chân đế sạc nhanh cho 3 tay cầm PS5', price: 449000, comparePrice: 690000, soldCount: 33, limitCount: 100, thumbSeed: 5, productType: 'accessory', platforms: ['PS5'], connectionType: 'wired', warrantyMonths: 6, category: 'Phụ kiện tay cầm' },
  { id: 'fs-7', name: 'Ốp bảo vệ chống trượt cho tay cầm Xbox', price: 89000, comparePrice: 149000, soldCount: 58, limitCount: 100, thumbSeed: 2, productType: 'accessory', platforms: ['Xbox Series X'], warrantyMonths: 3, category: 'Phụ kiện tay cầm' },
  { id: 'fs-8', name: 'Tai nghe gaming có dây 7.1 surround', price: 590000, comparePrice: 990000, soldCount: 76, limitCount: 100, thumbSeed: 1, productType: 'accessory', connectionType: 'wired', warrantyMonths: 12, category: 'Tai nghe gaming' },
]

export const ALL_PRODUCTS: Product[] = [...SUGGESTED_PRODUCTS, ...FLASH_SALE_PRODUCTS]

export function findProduct(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id)
}

export function productsByCategorySlug(slug: string): Product[] {
  return ALL_PRODUCTS.filter((p) => categorySlug(p.category) === slug)
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return ALL_PRODUCTS.filter((p) =>
    [p.name, p.category, p.publisher, p.genre, ...(p.platforms ?? [])]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(q)),
  )
}

export interface CategoryItem {
  label: string
  iconKey: string
}

export const CATEGORIES: CategoryItem[] = [
  { label: 'Tay cầm PS5', iconKey: 'gamepad' },
  { label: 'Tay cầm PS4', iconKey: 'gamepad' },
  { label: 'Tay cầm Xbox', iconKey: 'gamepad' },
  { label: 'Tay cầm Switch/PC', iconKey: 'gamepad' },
  { label: 'Đĩa game PS5', iconKey: 'disc' },
  { label: 'Đĩa game Xbox', iconKey: 'disc' },
  { label: 'Đĩa game Switch', iconKey: 'disc' },
  { label: 'Đĩa game PC', iconKey: 'disc' },
  { label: 'Phụ kiện tay cầm', iconKey: 'accessory' },
  { label: 'Tai nghe gaming', iconKey: 'headset' },
]

export interface VoucherOffer {
  id: string
  amountLabel: string
  conditionLabel: string
  title: string
  expiryLabel: string
  isShipping?: boolean
}

export const VOUCHERS: VoucherOffer[] = [
  { id: 'v-1', amountLabel: '₫50K', conditionLabel: 'Đơn từ 500K', title: 'Voucher toàn sàn', expiryLabel: 'HSD: 30/09/2026' },
  { id: 'v-2', amountLabel: '', conditionLabel: 'Freeship', title: 'Miễn phí vận chuyển', expiryLabel: 'Đơn từ 99K', isShipping: true },
  { id: 'v-3', amountLabel: '10%', conditionLabel: 'Tối đa 30K', title: 'Giảm cho đơn đầu tiên', expiryLabel: 'HSD: 15/10/2026' },
  { id: 'v-4', amountLabel: '₫30K', conditionLabel: 'Đơn từ 300K', title: 'Ngành hàng tay cầm', expiryLabel: 'HSD: 05/10/2026' },
]

export interface BannerSlide {
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  variant: 'a' | 'b' | 'c'
}

export const BANNER_SLIDES: BannerSlide[] = [
  { eyebrow: 'Ưu đãi tay cầm chính hãng', title: 'Giảm đến 30% tay cầm không dây', description: 'Áp dụng cho tay cầm PS5, Xbox Series X/S, Switch Pro', ctaLabel: 'Mua ngay', ctaHref: '#suggested-products', variant: 'a' },
  { eyebrow: 'Miễn phí vận chuyển', title: 'Freeship mọi đơn từ 99K', description: 'Nhập mã FREE99 tại trang thanh toán', ctaLabel: 'Lấy mã ngay', ctaHref: '#vouchers', variant: 'b' },
  { eyebrow: 'Đĩa game mới về', title: 'Hàng trăm tựa game mới cập bến', description: 'Giảm thêm 15% cho đơn hàng đầu tiên', ctaLabel: 'Khám phá', ctaHref: '#suggested-products', variant: 'c' },
]
