import { useEffect, useRef } from 'react'

/**
 * Adds an `is-visible` class to the returned ref's element the first time
 * it scrolls into view, then stops observing. Pair with the `.reveal-grid`
 * CSS pattern (site.css) for a staggered fade/slide-in on list children.
 * No-op (class added immediately) when the browser has no
 * IntersectionObserver or the user prefers reduced motion.
 */
export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-visible')
            observer.disconnect()
          }
        })
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
