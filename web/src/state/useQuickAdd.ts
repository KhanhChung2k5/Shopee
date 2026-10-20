import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProduct } from '../lib/catalog'
import { useAuth } from './AuthContext'
import { useCart } from './CartContext'

/**
 * Add-to-cart from a product card, which only knows the product id. The cart
 * API needs a variant id, so single-variant products are added directly and
 * multi-variant ones open the detail page so the buyer picks the variant.
 * Pass `variantId` when the card already knows it (e.g. Flash Sale items).
 */
export function useQuickAdd() {
  const { token } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)

  const quickAdd = async (productId: string, { goToCart = false, variantId }: { goToCart?: boolean; variantId?: string } = {}) => {
    if (!token) {
      navigate('/dang-nhap')
      return
    }
    setBusyId(productId)
    try {
      let targetVariantId = variantId
      if (!targetVariantId) {
        const product = await fetchProduct(productId)
        if (product.variants.length > 1) {
          navigate(`/san-pham/${productId}`)
          return
        }
        const variant = product.variants[0]
        if (!variant || variant.availableQuantity <= 0) {
          alert('Sản phẩm tạm hết hàng')
          return
        }
        targetVariantId = variant.id
      }
      const added = await addItem(targetVariantId, 1)
      if (!added) alert('Không thể thêm sản phẩm vào giỏ hàng')
      else if (goToCart) navigate('/gio-hang')
      else alert('Đã thêm sản phẩm vào giỏ hàng!')
    } catch {
      alert('Không tải được thông tin sản phẩm')
    } finally {
      setBusyId(null)
    }
  }

  return { quickAdd, busyId }
}
