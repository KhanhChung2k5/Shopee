import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import HeroCarousel from '../components/HeroCarousel'
import TrustBento from '../components/TrustBento'
import CategoryGrid from '../components/CategoryGrid'
import FlashSale from '../components/FlashSale'
import SuggestedProducts from '../components/SuggestedProducts'
import LeaderboardReviews from '../components/LeaderboardReviews'
import GamerClubBanner from '../components/GamerClubBanner'

export default function HomePage() {
  const { hash, search } = useLocation()

  // Header links from other pages land on "/#flash-sale" or "/?tab=…#goi-y": scroll there once the section exists
  // (sections fill in after their data loads, so keep looking for a few seconds).
  useEffect(() => {
    const id = hash.slice(1)
    if (!id) return
    let tries = 0
    const timer = window.setInterval(() => {
      const el = document.getElementById(id)
      if (el || ++tries > 30) {
        window.clearInterval(timer)
        el?.scrollIntoView({ behavior: 'smooth' })
      }
    }, 150)
    return () => window.clearInterval(timer)
  }, [hash, search])

  return (
    <div className="max-w-[1280px] mx-auto px-margin-desktop py-space-xl space-y-space-xl">
      <HeroCarousel />
      <TrustBento />
      <CategoryGrid />
      <FlashSale />
      <SuggestedProducts />
      <LeaderboardReviews />
      <GamerClubBanner />
    </div>
  )
}
