import { Button } from './ui'
import { useContinueShopping } from '../lib/shoppingTrail'

/** Back to the shopping page the buyer last left, at the same scroll position (home if there is none yet). */
export default function ContinueShoppingButton({ variant, size }: { variant?: 'outline'; size?: 'sm' }) {
  const continueShopping = useContinueShopping()
  return (
    <Button variant={variant} size={size} icon="storefront" onClick={continueShopping}>
      Tiếp tục mua sắm
    </Button>
  )
}
