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
  /** Full description text — from real product data where available. */
  description?: string
  price: number
  comparePrice: number
  rating?: number
  soldLabel?: string
  soldCount?: number
  limitCount?: number
  /** Fallback SVG placeholder seed — only used when imageUrl is absent. */
  thumbSeed: number
  /** Cover photo — used for card/grid thumbnails (Cloudinary URL). */
  imageUrl?: string
  /** Full photo gallery (multiple angles) — shown on the product detail page. Falls back to [imageUrl] when absent. */
  imageUrls?: string[]
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

// Nguồn: dự án tham khảo trước đó của nhóm (github.com/KhanhChung2k5/DCT123C5_WEB2,
// file insert_products.php) — 30/32 sản phẩm thật (bỏ 2 máy PS5/console vì
// productType hiện tại chỉ hỗ trợ game_disc/controller/accessory, không có
// console — theo đúng định hướng "chuyên tay cầm & đĩa game" đã chốt từ đầu).
// Ảnh copy vào web/public/products/. Ghi chú các điểm đã chỉnh so với nguồn gốc:
// - "Đĩa PS5 Horizon Complete Edition": ảnh gốc (dia_horion_2.jpg) bị thiếu trong
//   repo tham khảo — dùng tạm ảnh Horizon Zero Dawn Remastered thay thế.
// - Gran Turismo 7 (game đua xe): nguồn ghi nhầm genre "Phiêu lưu" — sửa lại
//   thành "Đua xe" cho đúng thể loại game thật.
// - 2 giá bị nhập thừa 1 số 0 ở nguồn gốc, đã sửa lại theo xác nhận: Tay cầm
//   DualSense Chroma Pearl (13.399.000đ → 1.339.900đ), Ốp bọc Grey Camo
//   (24.499.000đ → 2.449.900đ).
export const SUGGESTED_PRODUCTS: Product[] = [
  { id: 'sp-d1', name: 'Đĩa PS5 Horizon Zero Dawn Remastered', description: 'Thể loại: Phiêu lưu, Nhập vai. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1249000, comparePrice: 1249000, thumbSeed: 0, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757092/chotomua/products/dia_horion.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759683/chotomua/products/gallery/sp-d1-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759685/chotomua/products/gallery/sp-d1-2.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759688/chotomua/products/gallery/sp-d1-3.jpg'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Phiêu lưu, Nhập vai', category: 'Đĩa game PS5' },
  { id: 'sp-d2', name: 'Đĩa PS5 LEGO Horizon Adventure', description: 'Thể loại: Phiêu lưu, Nhập vai. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1499000, comparePrice: 1499000, thumbSeed: 1, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757094/chotomua/products/dia_lego.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759691/chotomua/products/gallery/sp-d2-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759694/chotomua/products/gallery/sp-d2-2.jpg'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Phiêu lưu, Nhập vai', category: 'Đĩa game PS5' },
  { id: 'sp-d3', name: 'Đĩa PS5 Until Dawn', description: 'Thể loại: Kinh dị, Sinh tồn. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1499000, comparePrice: 1499000, thumbSeed: 2, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757099/chotomua/products/dia_until.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759696/chotomua/products/gallery/sp-d3-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759698/chotomua/products/gallery/sp-d3-2.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759700/chotomua/products/gallery/sp-d3-3.jpg'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Kinh dị, Sinh tồn', category: 'Đĩa game PS5' },
  { id: 'sp-d4', name: 'Đĩa PS5 Astro Bot', description: 'Thể loại: Phiêu lưu. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1499000, comparePrice: 1499000, thumbSeed: 3, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757088/chotomua/products/dia_astro.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759703/chotomua/products/gallery/sp-d4-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759705/chotomua/products/gallery/sp-d4-2.jpg'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Phiêu lưu', category: 'Đĩa game PS5' },
  { id: 'sp-d5', name: 'Đĩa PS5 Stellar Blade', description: 'Thể loại: Hành động, Phiêu lưu. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1799000, comparePrice: 1799000, thumbSeed: 4, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757089/chotomua/products/dia_blade.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759707/chotomua/products/gallery/sp-d5-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759711/chotomua/products/gallery/sp-d5-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759717/chotomua/products/gallery/sp-d5-3.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759722/chotomua/products/gallery/sp-d5-4.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Phiêu lưu', category: 'Đĩa game PS5' },
  { id: 'sp-d6', name: 'Đĩa PS5 Rise of the Ronin', description: 'Thể loại: Hành động, Nhập vai. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1799000, comparePrice: 1799000, thumbSeed: 5, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757096/chotomua/products/dia_ronin.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759725/chotomua/products/gallery/sp-d6-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759731/chotomua/products/gallery/sp-d6-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759739/chotomua/products/gallery/sp-d6-3.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Nhập vai', category: 'Đĩa game PS5' },
  { id: 'sp-d7', name: 'Đĩa PS5 The Last of Us Part II Remastered', description: 'Thể loại: Phiêu lưu. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1499000, comparePrice: 1499000, thumbSeed: 0, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757095/chotomua/products/dia_remastered.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759742/chotomua/products/gallery/sp-d7-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759750/chotomua/products/gallery/sp-d7-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759758/chotomua/products/gallery/sp-d7-3.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759765/chotomua/products/gallery/sp-d7-4.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Phiêu lưu', category: 'Đĩa game PS5' },
  { id: 'sp-d9', name: 'Đĩa PS5 Spider-Man 2 Standard', description: 'Thể loại: Hành động, Nhập vai. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 14499000, comparePrice: 14499000, thumbSeed: 2, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757097/chotomua/products/dia_spider.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759768/chotomua/products/gallery/sp-d9-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759773/chotomua/products/gallery/sp-d9-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759778/chotomua/products/gallery/sp-d9-3.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Nhập vai', category: 'Đĩa game PS5' },
  { id: 'sp-d10', name: 'Đĩa PS5 Final Fantasy XVI STD', description: 'Thể loại: Phiêu lưu. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 12299000, comparePrice: 12299000, thumbSeed: 3, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757090/chotomua/products/dia_fantasy.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759781/chotomua/products/gallery/sp-d10-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759786/chotomua/products/gallery/sp-d10-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759792/chotomua/products/gallery/sp-d10-3.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759798/chotomua/products/gallery/sp-d10-4.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759803/chotomua/products/gallery/sp-d10-5.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Phiêu lưu', category: 'Đĩa game PS5' },
  { id: 'sp-d11', name: 'Đĩa PS5 Forspoken', description: 'Thể loại: Hành động, Nhập vai. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1249000, comparePrice: 1249000, thumbSeed: 4, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757091/chotomua/products/dia_forspoken.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759806/chotomua/products/gallery/sp-d11-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759808/chotomua/products/gallery/sp-d11-2.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Nhập vai', category: 'Đĩa game PS5' },
  { id: 'sp-d12', name: 'Đĩa PS5 God of War Ragnarök Standard Edition', description: 'Thể loại: Hành động, Phiêu lưu. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1799000, comparePrice: 1799000, thumbSeed: 5, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757092/chotomua/products/dia_god_of_war.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759811/chotomua/products/gallery/sp-d12-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759816/chotomua/products/gallery/sp-d12-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759822/chotomua/products/gallery/sp-d12-3.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Phiêu lưu', category: 'Đĩa game PS5' },
  { id: 'sp-d13', name: 'Đĩa PS5 Gran Turismo 7 STD', description: 'Thể loại: Đua xe. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1799000, comparePrice: 1799000, thumbSeed: 0, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757098/chotomua/products/dia_turismo.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759825/chotomua/products/gallery/sp-d13-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759830/chotomua/products/gallery/sp-d13-2.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Đua xe', category: 'Đĩa game PS5' },
  { id: 'sp-d15', name: 'Đĩa PS5 Death Stranding Director\'s Cut', description: 'Thể loại: Hành động. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1249000, comparePrice: 1249000, thumbSeed: 2, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757090/chotomua/products/dia_death.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759833/chotomua/products/gallery/sp-d15-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759836/chotomua/products/gallery/sp-d15-2.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động', category: 'Đĩa game PS5' },
  { id: 'sp-d16', name: 'Đĩa PS5 Ratchet & Clank: Rift Apart', description: 'Thể loại: Phiêu lưu. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1799000, comparePrice: 1799000, thumbSeed: 3, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757087/chotomua/products/dia_apart.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759839/chotomua/products/gallery/sp-d16-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759842/chotomua/products/gallery/sp-d16-2.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Phiêu lưu', category: 'Đĩa game PS5' },
  { id: 'sp-d17', name: 'Đĩa PS5 Nioh Collection', description: 'Thể loại: Hành động, Nhập vai. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1799000, comparePrice: 1799000, thumbSeed: 4, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757095/chotomua/products/dia_nioh.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759845/chotomua/products/gallery/sp-d17-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759847/chotomua/products/gallery/sp-d17-2.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Nhập vai', category: 'Đĩa game PS5' },

  { id: 'sp-c1', name: 'Tay cầm không dây DualSense - Chroma Indigo', description: 'Dùng để kết nối chơi game không dây trên PS5 và các thiết bị khác như PC/Điện thoại. Tích hợp cảm ứng đa chiều, loa và micro, Haptic feedback và Adaptive Trigger. USB Type-C sạc nhanh. Màu sắc: Chroma Indigo', price: 2299000, comparePrice: 2299000, thumbSeed: 5, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757104/chotomua/products/pk_indigo.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759850/chotomua/products/gallery/sp-c1-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759857/chotomua/products/gallery/sp-c1-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759861/chotomua/products/gallery/sp-c1-3.png'], productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'sp-c2', name: 'Tay cầm DualSense - Chroma Pearl', description: 'Dùng để kết nối chơi game không dây trên PS5 và các thiết bị khác như PC/Điện thoại. Tích hợp cảm ứng đa chiều, loa và micro, Haptic feedback và Adaptive Trigger. USB Type-C sạc nhanh. Màu sắc: Chroma Pearl', price: 1339900, comparePrice: 1339900, thumbSeed: 0, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757106/chotomua/products/pk_pearl.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759864/chotomua/products/gallery/sp-c2-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759868/chotomua/products/gallery/sp-c2-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759875/chotomua/products/gallery/sp-c2-3.png'], productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'sp-c3', name: 'Tay cầm không dây DualSense - Tím', description: 'Dùng để chơi cùng PS5', price: 2099000, comparePrice: 2099000, thumbSeed: 1, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757107/chotomua/products/pk_tim.webp', productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'sp-c4', name: 'Tay cầm không dây DualSense - Volcanic Red', description: 'Dùng để chơi cùng PS5', price: 2299000, comparePrice: 2299000, thumbSeed: 2, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757108/chotomua/products/pk_vocanic_red.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759878/chotomua/products/gallery/sp-c4-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759880/chotomua/products/gallery/sp-c4-2.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759883/chotomua/products/gallery/sp-c4-3.jpg'], productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'sp-c5', name: 'Tay cầm không dây DualSense Edge', description: 'Dùng để chơi cùng PS5', price: 5699000, comparePrice: 5699000, thumbSeed: 3, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757103/chotomua/products/pk_edge.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759886/chotomua/products/gallery/sp-c5-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759890/chotomua/products/gallery/sp-c5-2.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759893/chotomua/products/gallery/sp-c5-3.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759896/chotomua/products/gallery/sp-c5-4.jpg'], productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'sp-c6', name: 'Tay cầm không dây DualSense Nova Pink', description: 'Dùng để chơi cùng PS5', price: 2099000, comparePrice: 2099000, thumbSeed: 4, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757105/chotomua/products/pk_nova_pink.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759899/chotomua/products/gallery/sp-c6-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759901/chotomua/products/gallery/sp-c6-2.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759904/chotomua/products/gallery/sp-c6-3.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759907/chotomua/products/gallery/sp-c6-4.jpg'], productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'sp-c7', name: 'Tay cầm PS5 Access Controller CFI-ZAC1G', description: 'Dùng để chơi cùng PS5', price: 2599000, comparePrice: 2599000, thumbSeed: 5, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757102/chotomua/products/pk_controller.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759911/chotomua/products/gallery/sp-c7-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759913/chotomua/products/gallery/sp-c7-2.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759916/chotomua/products/gallery/sp-c7-3.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759918/chotomua/products/gallery/sp-c7-4.jpg'], productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },

  { id: 'sp-a1', name: 'Ốp bọc PS5 Cobalt Blue', description: 'Dùng để bọc PS5 bảo quản', price: 1599000, comparePrice: 1599000, thumbSeed: 0, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757099/chotomua/products/pk_boc_blue.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759920/chotomua/products/gallery/sp-a1-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759924/chotomua/products/gallery/sp-a1-2.jpg'], productType: 'accessory', platforms: ['PS5'], category: 'Phụ kiện tay cầm' },
  { id: 'sp-a2', name: 'Ốp bọc PS5 Volcanic Red', description: 'Dùng để bọc PS5 bảo quản', price: 1599000, comparePrice: 1599000, thumbSeed: 1, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757100/chotomua/products/pk_boc_red.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759926/chotomua/products/gallery/sp-a2-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759930/chotomua/products/gallery/sp-a2-2.jpg'], productType: 'accessory', platforms: ['PS5'], category: 'Phụ kiện tay cầm' },
  { id: 'sp-a3', name: 'Ốp bọc PlayStation 5 Grey Camo', description: 'Dùng để thay thế vỏ bọc của máy PS5 phiên bản ổ đĩa. Ốp bọc gồm có hai phần trên và dưới tách biệt, kích thước 390mm x 104mm x 260mm', price: 2449900, comparePrice: 2449900, thumbSeed: 2, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757104/chotomua/products/pk_grey_camo.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759933/chotomua/products/gallery/sp-a3-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759936/chotomua/products/gallery/sp-a3-2.jpg'], productType: 'accessory', platforms: ['PS5'], category: 'Phụ kiện tay cầm' },
  { id: 'sp-a4', name: 'Ốp bọc PS5 Sterling Silver', description: 'Dùng để thay thế vỏ bọc của máy PS5 phiên bản ổ đĩa. Ốp bọc gồm có hai phần trên và dưới tách biệt, kích thước 390mm x 104mm x 260mm', price: 1299000, comparePrice: 1299000, thumbSeed: 3, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757107/chotomua/products/pk_silver.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759938/chotomua/products/gallery/sp-a4-1.jpg'], productType: 'accessory', platforms: ['PS5'], category: 'Phụ kiện tay cầm' },
  { id: 'sp-a5', name: 'Đế sạc cho tay cầm DualSense', description: 'Mỗi tài khoản chỉ được mua một đế sạc', price: 799000, comparePrice: 799000, thumbSeed: 4, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757102/chotomua/products/pk_de_sac.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759940/chotomua/products/gallery/sp-a5-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759942/chotomua/products/gallery/sp-a5-2.jpg'], productType: 'accessory', platforms: ['PS5'], connectionType: 'wired', category: 'Phụ kiện tay cầm' },
  { id: 'sp-a6', name: 'Camera cảm biến cho PS5', description: 'Bộ phụ kiện camera cảm biến dùng cho máy chơi game Playstation 5', price: 1599000, comparePrice: 1599000, thumbSeed: 5, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757101/chotomua/products/pk_camera.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759944/chotomua/products/gallery/sp-a6-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759946/chotomua/products/gallery/sp-a6-2.jpg'], productType: 'accessory', platforms: ['PS5'], category: 'Phụ kiện tay cầm' },
]

// Flash sale: cùng data thật ở trên, chỉ thêm giá giảm + soldCount/limitCount
// giả lập cho mục đích demo (đây là số liệu vận hành/marketing theo thời gian
// thực, không phải thuộc tính định danh sản phẩm nên không lấy từ nguồn tham khảo).
export const FLASH_SALE_PRODUCTS: Product[] = [
  { id: 'fs-1', name: 'Tay cầm không dây DualSense - Chroma Indigo', description: 'Dùng để kết nối chơi game không dây trên PS5 và các thiết bị khác như PC/Điện thoại. Tích hợp cảm ứng đa chiều, loa và micro, Haptic feedback và Adaptive Trigger. USB Type-C sạc nhanh. Màu sắc: Chroma Indigo', price: 1990000, comparePrice: 2299000, soldCount: 68, limitCount: 100, thumbSeed: 5, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757104/chotomua/products/pk_indigo.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759850/chotomua/products/gallery/sp-c1-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759857/chotomua/products/gallery/sp-c1-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759861/chotomua/products/gallery/sp-c1-3.png'], productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'fs-2', name: 'Tay cầm không dây DualSense - Tím', description: 'Dùng để chơi cùng PS5', price: 1790000, comparePrice: 2099000, soldCount: 91, limitCount: 100, thumbSeed: 1, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757107/chotomua/products/pk_tim.webp', productType: 'controller', platforms: ['PS5'], connectionType: 'wireless', category: 'Tay cầm PS5' },
  { id: 'fs-3', name: 'Đĩa PS5 Stellar Blade', description: 'Thể loại: Hành động, Phiêu lưu. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1499000, comparePrice: 1799000, soldCount: 45, limitCount: 100, thumbSeed: 4, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757089/chotomua/products/dia_blade.webp', productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Phiêu lưu', category: 'Đĩa game PS5' },
  { id: 'fs-4', name: 'Đĩa PS5 Rise of the Ronin', description: 'Thể loại: Hành động, Nhập vai. Thiết bị sử dụng: Sony PlayStation 5. Đóng gói: Đĩa Blu-ray. Nhà Phát hành: Playstation Studios. Xuất xứ: Nhật Bản. Hình thức chơi: 1 người chơi', price: 1499000, comparePrice: 1799000, soldCount: 82, limitCount: 100, thumbSeed: 5, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757096/chotomua/products/dia_ronin.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759725/chotomua/products/gallery/sp-d6-1.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759731/chotomua/products/gallery/sp-d6-2.png', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759739/chotomua/products/gallery/sp-d6-3.png'], productType: 'game_disc', platforms: ['PS5'], publisher: 'Playstation Studios', genre: 'Hành động, Nhập vai', category: 'Đĩa game PS5' },
  { id: 'fs-5', name: 'Đế sạc cho tay cầm DualSense', description: 'Mỗi tài khoản chỉ được mua một đế sạc', price: 599000, comparePrice: 799000, soldCount: 97, limitCount: 100, thumbSeed: 4, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757102/chotomua/products/pk_de_sac.webp', imageUrls: ['https://res.cloudinary.com/ze2slibo/image/upload/v1790759940/chotomua/products/gallery/sp-a5-1.jpg', 'https://res.cloudinary.com/ze2slibo/image/upload/v1790759942/chotomua/products/gallery/sp-a5-2.jpg'], productType: 'accessory', platforms: ['PS5'], connectionType: 'wired', category: 'Phụ kiện tay cầm' },
  { id: 'fs-6', name: 'Ốp bọc PS5 Sterling Silver', description: 'Dùng để thay thế vỏ bọc của máy PS5 phiên bản ổ đĩa. Ốp bọc gồm có hai phần trên và dưới tách biệt, kích thước 390mm x 104mm x 260mm', price: 990000, comparePrice: 1299000, soldCount: 33, limitCount: 100, thumbSeed: 3, imageUrl: 'https://res.cloudinary.com/ze2slibo/image/upload/v1790757107/chotomua/products/pk_silver.webp', productType: 'accessory', platforms: ['PS5'], category: 'Phụ kiện tay cầm' },
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

// Chỉ 3 nhóm có data thật hiện tại (toàn bộ 30 sản phẩm tham khảo đều thuộc
// hệ PS5) — thêm Xbox/Switch/PC/tai nghe khi có data thật cho các nền tảng đó.
export const CATEGORIES: CategoryItem[] = [
  { label: 'Đĩa game PS5', iconKey: 'disc' },
  { label: 'Tay cầm PS5', iconKey: 'gamepad' },
  { label: 'Phụ kiện tay cầm', iconKey: 'accessory' },
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
  { eyebrow: 'Ưu đãi cho thành viên', title: 'Xem voucher đang có', description: 'Đăng nhập để xem mã giảm giá phù hợp với bạn', ctaLabel: 'Xem voucher', ctaHref: '#vouchers', variant: 'b' },
  { eyebrow: 'Đĩa game mới về', title: 'Hàng trăm tựa game mới cập bến', description: 'Giảm thêm 15% cho đơn hàng đầu tiên', ctaLabel: 'Khám phá', ctaHref: '#suggested-products', variant: 'c' },
]
