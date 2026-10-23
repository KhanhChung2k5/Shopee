import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProduct } from '../lib/catalog'
import { useAuth } from './AuthContext'
import { useCart } from './CartContext'

interface QuickAddOptions {
  goToCart?: boolean
  variantId?: string
  startRect?: DOMRect
  imageUrl?: string
  productName?: string
}

/**
 * Add-to-cart from a product card, which only knows the product id. The cart
 * API needs a variant id, so single-variant products are added directly and
 * multi-variant ones open the detail page so the buyer picks the variant.
 * Pass `variantId` when the card already knows it (e.g. Flash Sale items).
 */
export function useQuickAdd() {
  const { token } = useAuth()
  const { addItem, buyNow, showToast, triggerFlyAnimation } = useCart()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)

  const quickAdd = async (
    productId: string,
    { goToCart = false, variantId, startRect, imageUrl, productName }: QuickAddOptions = {}
  ) => {
    if (!token) {
      navigate('/dang-nhap')
      return
    }
    setBusyId(productId)
    try {
      let targetVariantId = variantId
      let resolvedName = productName
      let resolvedImage = imageUrl

      if (!targetVariantId) {
        const product = await fetchProduct(productId)
        if (!resolvedName) resolvedName = product.name
        if (!resolvedImage) resolvedImage = product.imageUrls?.[0]

        if (product.variants.length > 1) {
          navigate(`/san-pham/${productId}`)
          return
        }
        const variant = product.variants[0]
        if (!variant || variant.availableQuantity <= 0) {
          showToast('Sản phẩm tạm hết hàng')
          return
        }
        targetVariantId = variant.id
        if (variant.imageUrl) resolvedImage = variant.imageUrl
      }

      if (goToCart) {
        // "Mua ngay" logic: exclusively select this variant in the cart and navigate to cart
        const success = await buyNow(targetVariantId, 1)
        if (success) {
          navigate('/gio-hang')
        } else {
          showToast('Không thể thực hiện Mua ngay lúc này')
        }
      } else {
        // "Thêm vào giỏ hàng" logic: trigger parabolic fly animation & centered non-blocking toast
        if (startRect) {
          triggerFlyAnimation(startRect, resolvedImage)
        }
        const added = await addItem(targetVariantId, 1)
        if (added) {
          showToast('Đã thêm vào giỏ hàng thành công!', resolvedName)
        } else {
          showToast('Không thể thêm sản phẩm vào giỏ hàng')
        }
      }
    } catch {
      showToast('Không tải được thông tin sản phẩm')
    } finally {
      setBusyId(null)
    }
  }

  return { quickAdd, busyId }
}
