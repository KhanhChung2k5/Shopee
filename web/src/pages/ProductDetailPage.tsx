import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductThumb from '../components/ProductThumb'
import { fetchProduct, formatVnd, resolveCatalogImageUrl, type CatalogProduct, type ProductType } from '../lib/catalog'
import { CONNECTION_LABELS, discountPercent, findProduct, type Product } from '../data/sampleProducts'
import { useCart } from '../state/CartContext'

// The catalog contains deterministic UUID-shaped IDs for demo products. They
// are accepted by the backend's UUID parser even when they do not carry an
// RFC version/variant nibble, so validate the textual shape only here.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function attributesLabel(attributes: Record<string, unknown> | string[] | null) {
  if (!attributes) return ''
  if (Array.isArray(attributes)) return attributes.join(' · ')
  return Object.entries(attributes).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  game_disc: 'Đĩa game',
  controller: 'Tay cầm',
  accessory: 'Phụ kiện',
}

function sampleOrigin(sample: Product | undefined) {
  if (!sample) return undefined
  if (sample.originCountry) return sample.originCountry
  return sample.description?.match(/(?:Xuất xứ|Nơi sản xuất)\s*:\s*([^.;]+)/i)?.[1]?.trim()
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const sampleProduct = id && !UUID_PATTERN.test(id) ? findProduct(id) : undefined

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setProduct(null)
    setSelectedVariantId('')
    setQty(1)
    setActiveImg(0)
    if (!id || !UUID_PATTERN.test(id)) {
      setProduct(null)
      setError(id && findProduct(id) ? '' : 'Không tìm thấy sản phẩm.')
      setLoading(false)
      return () => { active = false }
    }
    fetchProduct(id)
      .then((data) => {
        if (!active) return
        setProduct(data)
        setSelectedVariantId(data.variants[0]?.id ?? '')
        setQty(1)
        setActiveImg(0)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được sản phẩm.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const variant = useMemo(() => product?.variants.find((item) => item.id === selectedVariantId) ?? null, [product, selectedVariantId])
  const gallery = sampleProduct
    ? sampleProduct.imageUrls?.length ? sampleProduct.imageUrls : sampleProduct.imageUrl ? [sampleProduct.imageUrl] : []
    : product?.imageUrls?.length ? product.imageUrls : variant?.imageUrl ? [variant.imageUrl] : []
  const available = variant?.availableQuantity ?? 0
  const canBuy = sampleProduct ? true : !!variant && available > 0 && qty <= available
  const name = sampleProduct?.name ?? product?.name ?? ''
  const description = sampleProduct?.description ?? product?.description
  const productType = sampleProduct?.productType ?? product?.productType ?? 'accessory'
  const thumbSeed = sampleProduct?.thumbSeed ?? 0
  const price = sampleProduct?.price ?? variant?.price ?? null
  const comparePrice = sampleProduct?.comparePrice ?? variant?.comparePrice ?? null
  const pct = price != null && comparePrice != null && comparePrice > price
    ? sampleProduct ? discountPercent(price, comparePrice) : Math.round((1 - price / comparePrice) * 100)
    : 0
  const detailRows = [
    { label: 'Loại sản phẩm', value: PRODUCT_TYPE_LABELS[productType] },
    { label: 'Thương hiệu', value: product?.brandName },
    { label: 'Xuất xứ', value: sampleOrigin(sampleProduct) ?? product?.originCountry },
    { label: 'Nền tảng', value: sampleProduct?.platforms?.join(', ') ?? product?.platforms?.join(', ') },
    { label: 'Ngày phát hành', value: product?.releaseDate ? new Date(`${product.releaseDate}T00:00:00`).toLocaleDateString('vi-VN') : undefined },
    { label: 'Nhà phát hành', value: sampleProduct?.publisher ?? product?.publisher },
    { label: 'Thể loại', value: sampleProduct?.genre ?? product?.genre },
    { label: 'Độ tuổi', value: sampleProduct?.ageRating ?? product?.ageRating },
    {
      label: 'Kết nối',
      value: sampleProduct?.connectionType
        ? CONNECTION_LABELS[sampleProduct.connectionType]
        : product?.connectionType ? CONNECTION_LABELS[product.connectionType] : undefined,
    },
    {
      label: 'Bảo hành',
      value: sampleProduct?.warrantyMonths
        ? `${sampleProduct.warrantyMonths} tháng`
        : product?.warrantyMonths != null ? `${product.warrantyMonths} tháng` : undefined,
    },
  ].filter((row): row is { label: string; value: string } => typeof row.value === 'string' && row.value.trim().length > 0)

  const purchase = (goToCart: boolean) => {
    if (sampleProduct) {
      addItem(sampleProduct.id, qty)
      if (goToCart) navigate('/gio-hang')
      return
    }
    if (!product || !canBuy || !variant) return
    addItem(product.id, qty, {
      variantId: variant.id,
      variantLabel: attributesLabel(variant.attributes) || variant.sku,
      availableQuantity: available,
      productSnapshot: {
        name: product.name,
        price: variant.price,
        comparePrice: variant.comparePrice,
        imageUrl: gallery[0] ?? variant.imageUrl,
        productType: product.productType,
        thumbSeed: 0,
      },
    })
    if (goToCart) navigate('/gio-hang')
  }

  if (!sampleProduct && loading) return <div className="container" style={{ padding: 'var(--space-6) 0' }}>Đang tải thông tin sản phẩm…</div>
  if (!sampleProduct && !product) {
    return <div className="container" style={{ padding: 'var(--space-6) 0', textAlign: 'center' }}>
      <p>{error || 'Không tìm thấy sản phẩm.'}</p>
      <Link className="button button--outline" to="/#categories">Xem danh mục sản phẩm</Link>
    </div>
  }

  return (
    <div className="container">
      <div className="product-detail">
        <div>
          <div className="product-detail__media">
            <ProductThumb seed={thumbSeed} productType={productType} imageUrl={gallery[activeImg]} appearance="detail" />
          </div>
          {gallery.length > 1 && <div className="product-detail__gallery" role="list" aria-label="Ảnh sản phẩm khác">
            {gallery.map((url, index) => <button key={url} type="button" role="listitem" className={`product-detail__gallery-item${index === activeImg ? ' product-detail__gallery-item--active' : ''}`} onClick={() => setActiveImg(index)} aria-label={`Xem ảnh ${index + 1}`} aria-current={index === activeImg}>
              <img src={resolveCatalogImageUrl(url)} alt="" loading="lazy" />
            </button>)}
          </div>}
        </div>
        <div>
          <h1 className="product-detail__title">{name}</h1>
          {description && <p className="product-detail__description">{description}</p>}
          <div className="product-detail__price-row">
            {pct > 0 && <span className="product-detail__badge">-{pct}%</span>}
            <span className="product-detail__price">{formatVnd(price)}</span>
            {pct > 0 && <span className="product-detail__compare">{formatVnd(comparePrice)}</span>}
          </div>

          <div className="product-detail__meta">
            {sampleProduct ? <>
              <span>{sampleProduct.rating != null ? `⭐ ${sampleProduct.rating}` : 'Chưa có đánh giá'}</span>
              <span>{sampleProduct.soldLabel || sampleProduct.soldCount != null ? `Đã bán ${sampleProduct.soldLabel ?? sampleProduct.soldCount}` : 'Chưa có dữ liệu lượt bán'}</span>
            </> : <>
              <span>{variant ? `Mã: ${variant.sku}` : 'Chưa có SKU'}</span>
              <span style={{ color: available > 0 ? 'var(--color-trust)' : 'var(--color-urgent)' }}>{available > 0 ? `Còn ${available} sản phẩm` : 'Hết hàng'}</span>
            </>}
          </div>

          <fieldset className="product-detail__specs product-detail__variant-picker">
            <legend>Tùy chọn sản phẩm</legend>
            {product?.variants.length ? product.variants.map((item) => <label key={item.id} className="product-detail__variant-option">
              <input type="radio" name="variant" value={item.id} checked={selectedVariantId === item.id} onChange={() => { setSelectedVariantId(item.id); setQty(1) }} />
              <span>{attributesLabel(item.attributes) || 'Mặc định'} · {formatVnd(item.price)} · {item.availableQuantity > 0 ? `Còn ${item.availableQuantity}` : 'Hết hàng'}</span>
            </label>) : <p className="product-detail__variant-empty">Sản phẩm không có lựa chọn biến thể.</p>}
          </fieldset>

          <section className="product-detail__spec-section" aria-labelledby="product-specs-title">
            <h2 id="product-specs-title">Thông số sản phẩm</h2>
            {detailRows.length > 0
              ? <dl className="product-detail__spec-list">
                {detailRows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
              </dl>
              : <p className="product-detail__spec-empty">Thông số sản phẩm đang được cập nhật.</p>}
          </section>

          <div className="product-detail__qty">
            <span>Số lượng</span>
            <div className="qty-stepper">
              <button type="button" disabled={(!sampleProduct && !canBuy) || qty <= 1} onClick={() => setQty((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng">−</button>
              <span>{qty}</span>
              <button type="button" disabled={sampleProduct ? false : !canBuy || qty >= available} onClick={() => setQty((value) => sampleProduct ? value + 1 : Math.min(available, value + 1))} aria-label="Tăng số lượng">+</button>
            </div>
          </div>
          <div className="product-detail__actions">
            <button className="button button--outline" type="button" disabled={!canBuy} onClick={() => purchase(false)}>Thêm vào giỏ hàng</button>
            <button className="button button--primary" type="button" disabled={!canBuy} onClick={() => purchase(true)}>Mua ngay</button>
          </div>
          {!sampleProduct && !canBuy && <p role="status" style={{ color: 'var(--color-urgent)', marginTop: 12 }}>Sản phẩm/biến thể hiện không đủ tồn kho để mua.</p>}
        </div>
      </div>
    </div>
  )
}
