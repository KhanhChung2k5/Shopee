import { useState, useEffect } from 'react'

interface Slide {
  badge: string
  title: string
  desc: string
  highlight: string
  image: string
  linkText: string
  linkHref: string
}

const SLIDES: Slide[] = [
  {
    badge: 'Siêu Hội Gaming Tháng 2',
    title: 'Đại Tiệc Tay Cầm & Đĩa Game 2025',
    desc: 'Ưu đãi chấn động tới 50%. Đầy đủ dòng DualSense, Xbox Elite & Đĩa game bom tấn sealed chính hãng.',
    highlight: '50%',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC2YTcG8-tzuO327K8MJovKlwDW6j1Suya4MJZhb-4brGzwk3b-XUN2yOrYB9vLcS7vtJPeWKcYb5tiPyfPdJ6wL7HzBmcTtYizIZNgxC1cqLjRSS5bNJ_UVrA-gjlLMcur245WMxDViORYF3K9WRmVlH6WsAgEZV6pR3Z6jRnUmM5LMXtuq1Y9PX6hrdn6R6uWSeZecwezB5XqEc56actfpu9V4M1mfSdZ0uDTiup0c4Dai0GFHFcq',
    linkText: 'Khám Phá Ngay',
    linkHref: '#flash-sale',
  },
  {
    badge: 'Độc Quyền Tại Chợ Tốt Mua',
    title: 'Sony DualSense Edge Pro Gear',
    desc: 'Bản nâng cấp cần Hall Effect chống trôi tuyệt đối. Phím phụ gán macro, bảo hành 12 tháng 1 đổi 1.',
    highlight: 'Hall Effect',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNlww-GvuA9PXl2L6YC3hdBiKU_v8ukqp3OMhbGACT-KkkOUEyMlZkArRhRVd6KdbgCCnnmx-uXCP6vlOq3MkzUPxXoZu3MxgQupr6GXzYYL9Qne9MA1vhugpTKJnz_hnmf-FORjSAchZo0ACP2KECR2y9U4yYoX8a3_HcBCSFB-9c0EOQu9gcIsMZE0l57dGGyBg4KUM2UXvg-IyJw2K5CJ1Jxj5peLYcOxys-yz_Zy1RYaTCazsC',
    linkText: 'Xem Chi Tiết',
    linkHref: '#goi-y',
  },
  {
    badge: 'Bom Tấn Mới Ra Mắt',
    title: 'Black Myth: Wukong & FC 25 PS5',
    desc: 'Đĩa vật lý Sealed 100% kèm phụ kiện tặng độc quyền. Giao hàng hỏa tốc 2 giờ nội thành.',
    highlight: 'Sealed 100%',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAM3wUxxiYFEOwbWRpAFVEV9B6iTifVVsUkOgZw2PkGBBSCNwS11J6Z6foW0bFC2j6ZWxf9jJtbWZ6oehj8ZtJ8Olsfbjt54Lf0k4bz8kGKDLprJ-_SZUzblLPzOp2o7Tr38xm-8__NeHa5A3bzmHZzQOBoVaXqlaL_iOOT912cah4yTYGg0ZjSjrkktedFpIQm0PYhJBSdVcABBpfQ3gwiAKCmzfgm4e7o9931zlXvOtNANdA7WJHN',
    linkText: 'Săn Ngay Đĩa Hot',
    linkHref: '#flash-sale',
  },
]

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const currentSlide = SLIDES[current]

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-stretch">
      <div className="lg:col-span-8 relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between min-h-[380px] p-space-xl group">
        <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-low/60 to-transparent z-10"></div>
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('${currentSlide.image}')` }}
        ></div>

        <div className="relative z-20 max-w-lg space-y-space-md">
          <div className="inline-flex items-center gap-space-xs px-2.5 py-1 bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider rounded-full shadow-sm">
            <span className="material-symbols-outlined text-sm">local_fire_department</span>
            <span>{currentSlide.badge}</span>
          </div>

          <div className="space-y-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-tight">
              {currentSlide.title}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant font-medium">
              {currentSlide.desc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
            <a
              className="px-space-xl py-3 bg-primary hover:bg-primary-container text-on-primary font-title-lg text-title-lg rounded-lg shadow-md transition-all flex items-center gap-space-xs"
              href={currentSlide.linkHref}
            >
              <span>{currentSlide.linkText}</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </a>
            <a
              className="px-space-lg py-3 bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-primary font-title-lg text-title-lg rounded-lg shadow-sm transition-all flex items-center gap-space-xs"
              href="#gamer-club"
            >
              <span className="material-symbols-outlined text-lg">loyalty</span>
              <span>Săn Voucher 100K</span>
            </a>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-space-xs self-start pt-space-lg">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`rounded-full transition-all cursor-pointer ${
                idx === current
                  ? 'w-8 h-2 bg-primary'
                  : 'w-2 h-2 bg-surface-container-highest hover:bg-primary/50'
              }`}
              aria-label={`Chuyển đến banner ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-gutter-desktop">
        <div className="flex-1 relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105 opacity-20"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC9eANfe6HvChh7-yYxa_1yZ1ElDSqt3z4yvc8VfztGEpwShTv3S1tuqBS_Ywnfek3pL1H8ELJ78OpxVA89GzccskmIdIBKG5hc0C4q-3mYrSIG-39-xfU3Y-JN-NKY_Twumx5YJ9E-fHCLQk31dmDWfMlW7KmPE5gyxZOY5CasrgPekPOlxUhNZ1R-NP1bVTrle01MYjhKkOqPcvqow13PxLj0iVb71FiI9QJ95L7-Us6xOCbPe2aO')",
            }}
          ></div>
          <div className="relative z-10 space-y-space-xs">
            <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm rounded uppercase font-bold">
              Gamer Club
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Tích Điểm Đổi Voucher 500K
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Nhận voucher độc quyền, freeship không giới hạn cho mọi đơn hàng.
            </p>
          </div>
          <a
            className="relative z-10 self-start text-primary font-title-md text-title-md flex items-center gap-1 hover:underline pt-space-sm"
            href="#gamer-club"
          >
            <span>Xem quyền lợi thành viên</span>
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </a>
        </div>

        <div className="flex-1 relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105 opacity-20"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCgVozDxLH3yTqBOYcvNGOAABuZn0OGA3O-W5ZCXBiTZaRUAuRFpQcGOsi9aa4783uUhrokLw2X213jZqyTEnJvsuEdcHgb7649Qe8yAcb9lb-9Wr6pyGIAGdp4k3Ys-YdtEUFLBZenBQC78zuieOrxn0BOfQjB2WHVCKhNrKk_3kQeEywUQvuvNAeD9iygFa1yki6RagEj22xmQ8AEDCtHCQ0gi_0-RHBgoy4v3Q8C960XNdrB2L-R')",
            }}
          ></div>
          <div className="relative z-10 space-y-space-xs">
            <span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm rounded uppercase font-bold">
              Combo Tiết Kiệm
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Mua Tay Cầm Tặng Bọc Cần Analog
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Áp dụng cho mọi tay cầm PS5 DualSense &amp; Xbox Series X.
            </p>
          </div>
          <a
            className="relative z-10 self-start text-primary font-title-md text-title-md flex items-center gap-1 hover:underline pt-space-sm"
            href="#goi-y"
          >
            <span>Chọn combo ngay</span>
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </a>
        </div>
      </div>
    </section>
  )
}
