import { useEffect, useState, type CSSProperties } from 'react'

export interface FlyItem {
  id: string
  startX: number
  startY: number
  targetX: number
  targetY: number
  imageUrl?: string
}

interface ToastMessage {
  id: string
  title: string
  subtitle?: string
}

let toastListener: ((toast: ToastMessage | null) => void) | null = null
let flyListener: ((item: FlyItem) => void) | null = null

export function emitCartToast(title: string, subtitle?: string) {
  if (toastListener) {
    toastListener({ id: String(Date.now()), title, subtitle })
  }
}

export function emitFlyAnimation(startRect: DOMRect, imageUrl?: string) {
  if (!flyListener) return

  // Find cart target icon: desktop or mobile
  const desktopTarget = document.getElementById('header-cart-icon')
  const mobileTarget = document.getElementById('mobile-cart-icon')
  const targetElement = (desktopTarget && desktopTarget.offsetParent !== null)
    ? desktopTarget
    : (mobileTarget && mobileTarget.offsetParent !== null)
    ? mobileTarget
    : desktopTarget

  const targetRect = targetElement?.getBoundingClientRect()
  const targetX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth - 60
  const targetY = targetRect ? targetRect.top + targetRect.height / 2 : 24

  const startX = startRect.left + startRect.width / 2
  const startY = startRect.top + startRect.height / 2

  flyListener({
    id: `fly-${Date.now()}-${Math.random()}`,
    startX,
    startY,
    targetX,
    targetY,
    imageUrl,
  })
}

export function CartCenteredToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => {
    toastListener = (nextToast) => {
      setToast(nextToast)
    }
    return () => {
      toastListener = null
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 1800)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center p-4 transition-all"
      aria-live="polite"
      role="status"
    >
      <div className="bg-neutral-900/90 dark:bg-neutral-800/95 text-white backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-white/10 max-w-md w-auto animate-in fade-in zoom-in-95 duration-200">
        <span className="material-symbols-outlined text-3xl text-emerald-400 flex-shrink-0" aria-hidden="true">
          check_circle
        </span>
        <div className="min-w-0">
          <p className="font-title-md text-base font-semibold leading-tight text-white">
            {toast.title}
          </p>
          {toast.subtitle && (
            <p className="font-body-sm text-xs text-neutral-300 truncate max-w-[260px] sm:max-w-xs mt-0.5">
              {toast.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function FlyParticle({ item, onComplete }: { item: FlyItem; onComplete: (id: string) => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 600

    let frameId: number
    const frame = (now: number) => {
      const elapsed = now - start
      const p = Math.min(1, elapsed / duration)
      setProgress(p)
      if (p < 1) {
        frameId = requestAnimationFrame(frame)
      } else {
        onComplete(item.id)
      }
    }

    frameId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameId)
  }, [item.id, onComplete])

  // Parabolic motion: x is linear ease-out, y arcs upward slightly then drops to target
  const dx = item.targetX - item.startX
  const dy = item.targetY - item.startY

  const currentX = item.startX + dx * progress
  // Parabola vertex: arc height depends on distance
  const arcHeight = Math.max(60, Math.abs(dx) * 0.25)
  const currentY = item.startY + dy * progress - 4 * arcHeight * progress * (1 - progress)

  const scale = 1 - 0.7 * progress
  const opacity = progress > 0.85 ? (1 - progress) / 0.15 : 1

  const style: CSSProperties = {
    position: 'fixed',
    left: `${currentX}px`,
    top: `${currentY}px`,
    transform: `translate(-50%, -50%) scale(${scale})`,
    opacity,
    pointerEvents: 'none',
    zIndex: 9998,
  }

  return (
    <div style={style}>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="w-12 h-12 object-cover rounded-full shadow-lg border-2 border-primary bg-white"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg border-2 border-white">
          <span className="material-symbols-outlined text-lg">shopping_cart</span>
        </div>
      )}
    </div>
  )
}

export function FlyAnimationOverlay({ onBump }: { onBump?: () => void }) {
  const [items, setItems] = useState<FlyItem[]>([])

  useEffect(() => {
    flyListener = (newItem) => {
      setItems((prev) => [...prev, newItem])
    }
    return () => {
      flyListener = null
    }
  }, [])

  const handleComplete = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
    if (onBump) {
      onBump()
    }
  }

  if (items.length === 0) return null

  return (
    <>
      {items.map((it) => (
        <FlyParticle key={it.id} item={it} onComplete={handleComplete} />
      ))}
    </>
  )
}
