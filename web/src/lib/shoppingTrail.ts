import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * "Tiếp tục mua sắm" takes the shopper back to the shopping page they last left (home, a category, a search or a
 * product) and to the same scroll position, instead of always to the top of the home page.
 */
const KEY = 'ctm:last-shopping'
const SHOPPING_PATH = /^\/($|danh-muc\/|tim-kiem|san-pham\/)/

interface Trail { url: string; scrollY: number }

export function readTrail(): Trail | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed.url === 'string' ? parsed : null
  } catch {
    return null
  }
}

/** Mounted once in the customer shell: remembers where the shopper was on each shopping page. */
export function useShoppingTrail() {
  const { pathname, search } = useLocation()
  const scrollY = useRef(0)

  useEffect(() => {
    if (!SHOPPING_PATH.test(pathname)) return
    const url = pathname + search
    const save = () => {
      try { sessionStorage.setItem(KEY, JSON.stringify({ url, scrollY: scrollY.current })) } catch { /* storage blocked */ }
    }
    let frame = 0
    const onScroll = () => {
      scrollY.current = window.scrollY
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(save)
    }
    scrollY.current = window.scrollY
    save()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); save() }
  }, [pathname, search])
}

/**
 * Mounted once in the customer shell: a navigation that carries `restoreScrollY` scrolls back there once the page has
 * grown tall enough (lists load after the route renders, so keep trying for a few seconds).
 */
export function useRestoreScroll() {
  const location = useLocation()
  const target = (location.state as { restoreScrollY?: number } | null)?.restoreScrollY

  useEffect(() => {
    if (typeof target !== 'number') return
    let tries = 0
    const timer = window.setInterval(() => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= target
      if (reachable || ++tries > 40) {
        window.clearInterval(timer)
        window.scrollTo({ top: target })
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [location.key, target])
}

/** Returns a handler that goes back to the last shopping spot (or home if there is none). */
export function useContinueShopping() {
  const navigate = useNavigate()
  return () => {
    const trail = readTrail()
    if (!trail) { navigate('/'); return }
    navigate(trail.url, { state: { restoreScrollY: trail.scrollY } })
  }
}
