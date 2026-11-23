import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * "Tiếp tục mua sắm" takes the shopper back to the product list they last left (home, a category page with its
 * filters and page number, or a search) and scrolls to the product they opened there, at the same place on screen.
 * A product detail page is not a list, so it never replaces the remembered list.
 */
const KEY = 'ctm:last-shopping'
const LIST_PATH = /^\/($|danh-muc\/|tim-kiem)/
const PRODUCT_HREF = /\/san-pham\/([^/?#]+)/

interface Trail {
  url: string
  scrollY: number
  /** Product the shopper last clicked on this list, and where its card sat in the viewport at that moment. */
  productId?: string
  productTop?: number
  productViewportTop?: number
}

export interface RestoreState {
  restoreScrollY?: number
  restoreProductId?: string
  restoreProductTop?: number
  restoreProductViewportTop?: number
}

export function readTrail(): Trail | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed.url === 'string' ? parsed : null
  } catch {
    return null
  }
}

function writeTrail(trail: Trail) {
  try { sessionStorage.setItem(KEY, JSON.stringify(trail)) } catch { /* storage blocked */ }
}

/** The product a click landed on: a card marked with data-product-anchor, or any link to a product page. */
function productFromClick(target: EventTarget | null): { id: string; element: HTMLElement } | null {
  if (!(target instanceof Element)) return null
  const card = target.closest<HTMLElement>('[data-product-anchor]')
  if (card?.dataset.productAnchor) return { id: card.dataset.productAnchor, element: card }
  const link = target.closest<HTMLAnchorElement>('a[href]')
  const match = link?.getAttribute('href')?.match(PRODUCT_HREF)
  return link && match ? { id: decodeURIComponent(match[1]), element: link } : null
}

/** Mounted once in the customer shell: remembers the list page, its scroll position and the product clicked on it. */
export function useShoppingTrail() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    if (!LIST_PATH.test(pathname)) return
    const url = pathname + search
    // Keep the clicked product only while we are still on the list it was clicked on.
    const previous = readTrail()
    let trail: Trail = previous?.url === url ? { ...previous } : { url, scrollY: window.scrollY }

    let frame = 0
    const onScroll = () => {
      trail.scrollY = window.scrollY
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => writeTrail(trail))
    }
    const onClick = (event: MouseEvent) => {
      const hit = productFromClick(event.target)
      if (!hit) return
      const rect = hit.element.getBoundingClientRect()
      trail = {
        url,
        scrollY: window.scrollY,
        productId: hit.id,
        productTop: rect.top + window.scrollY,
        productViewportTop: rect.top,
      }
      writeTrail(trail)
    }

    if (previous?.url !== url) writeTrail(trail)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick, true)
      cancelAnimationFrame(frame)
      writeTrail(trail)
    }
  }, [pathname, search])
}

/** Every element on the page that stands for this product: its card if it has one, otherwise a link to it. */
function productElements(productId: string): HTMLElement[] {
  const cards = [...document.querySelectorAll<HTMLElement>('[data-product-anchor]')]
    .filter((element) => element.dataset.productAnchor === productId)
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter((link) => !link.closest('[data-product-anchor]'))
    .filter((link) => decodeURIComponent(link.getAttribute('href')?.match(PRODUCT_HREF)?.[1] ?? '') === productId)
  return [...cards, ...links]
}

function highlight(element: HTMLElement) {
  element.animate?.(
    [
      { boxShadow: '0 0 0 3px var(--color-primary, #F0562E)', offset: 0 },
      { boxShadow: '0 0 0 3px var(--color-primary, #F0562E)', offset: 0.6 },
      { boxShadow: '0 0 0 3px transparent' },
    ],
    { duration: 1800, easing: 'ease-out' },
  )
}

/**
 * Sections above the product (banner, flash sale…) may finish loading after we scrolled and push it down. Keep the
 * product at the same spot on screen for a couple of seconds, and stop as soon as the shopper scrolls themselves.
 */
let stopPinning: (() => void) | null = null

function pinWhileLayoutSettles(element: HTMLElement, viewportTop: number) {
  stopPinning?.()
  let ticks = 0
  const stop = () => {
    window.clearInterval(timer)
    for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) window.removeEventListener(type, stop)
    if (stopPinning === stop) stopPinning = null
  }
  const timer = window.setInterval(() => {
    if (!element.isConnected || ++ticks > 25) { stop(); return }
    const drift = element.getBoundingClientRect().top - viewportTop
    if (Math.abs(drift) > 1) window.scrollBy({ top: drift })
  }, 100)
  for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) {
    window.addEventListener(type, stop, { passive: true })
  }
  stopPinning = stop
}

/**
 * Mounted once in the customer shell: a navigation that carries a restore state scrolls back to the product the
 * shopper opened (same spot on screen, highlighted for a moment), or to the old scroll position if that product is no
 * longer on the page. Lists load after the route renders, so keep trying for a few seconds.
 */
export function useRestoreScroll() {
  const location = useLocation()
  const state = (location.state as RestoreState | null) ?? {}
  const { restoreScrollY, restoreProductId, restoreProductTop, restoreProductViewportTop } = state

  useEffect(() => {
    if (typeof restoreScrollY !== 'number' && !restoreProductId) return
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      if (restoreProductId) {
        const candidates = productElements(restoreProductId)
        if (candidates.length > 0) {
          // The same product can sit in several sections (flash sale, suggestions…): take the one it was clicked in.
          const pageTop = (element: HTMLElement) => element.getBoundingClientRect().top + window.scrollY
          const element = candidates.reduce((best, current) =>
            Math.abs(pageTop(current) - (restoreProductTop ?? 0)) < Math.abs(pageTop(best) - (restoreProductTop ?? 0)) ? current : best)
          // Same spot on screen as when it was clicked, but never tucked under the fixed header.
          const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
          const viewportTop = Math.min(
            Math.max(restoreProductViewportTop ?? window.innerHeight / 3, headerBottom + 16),
            Math.max(headerBottom + 16, window.innerHeight - element.offsetHeight - 16),
          )
          window.clearInterval(timer)
          window.scrollTo({ top: Math.max(0, pageTop(element) - viewportTop) })
          highlight(element)
          pinWhileLayoutSettles(element, viewportTop)
          return
        }
      }
      const target = restoreScrollY ?? 0
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= target
      // Give the product a few seconds to appear before falling back to the plain scroll position.
      if (tries > 50 || (!restoreProductId && reachable)) {
        window.clearInterval(timer)
        window.scrollTo({ top: target })
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [location.key, restoreScrollY, restoreProductId, restoreProductTop, restoreProductViewportTop])
}

/** Returns a handler that goes back to the last product list and product (or home if there is none). */
export function useContinueShopping() {
  const navigate = useNavigate()
  return () => {
    const trail = readTrail()
    if (!trail) { navigate('/'); return }
    const state: RestoreState = {
      restoreScrollY: trail.scrollY,
      restoreProductId: trail.productId,
      restoreProductTop: trail.productTop,
      restoreProductViewportTop: trail.productViewportTop,
    }
    navigate(trail.url, { state })
  }
}
