import HeroCarousel from '../components/HeroCarousel'
import TrustBento from '../components/TrustBento'
import CategoryGrid from '../components/CategoryGrid'
import FlashSale from '../components/FlashSale'
import SuggestedProducts from '../components/SuggestedProducts'
import LeaderboardReviews from '../components/LeaderboardReviews'
import GamerClubBanner from '../components/GamerClubBanner'

export default function HomePage() {
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
