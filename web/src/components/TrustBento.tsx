export default function TrustBento() {
  return (
    <section id="cam-ket" className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        <div className="flex items-center gap-space-md p-space-xs">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
          </div>
          <div>
            <h4 className="font-title-md text-title-md text-on-surface">100% Chính Hãng</h4>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Hoàn tiền 200% nếu phát hiện hàng giả
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-md p-space-xs">
          <div className="w-12 h-12 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary flex-shrink-0">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              electric_bolt
            </span>
          </div>
          <div>
            <h4 className="font-title-md text-title-md text-on-surface">Giao Hỏa Tốc 2H</h4>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Nội thành TP.HCM &amp; Hà Nội nhận liền
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-md p-space-xs">
          <div className="w-12 h-12 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary flex-shrink-0">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              published_with_changes
            </span>
          </div>
          <div>
            <h4 className="font-title-md text-title-md text-on-surface">Đổi Mới 30 Ngày</h4>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Lỗi phần cứng là đổi mới ngay tận nhà
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-md p-space-xs">
          <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface flex-shrink-0">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              credit_card
            </span>
          </div>
          <div>
            <h4 className="font-title-md text-title-md text-on-surface">Trả Góp 0%</h4>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Hỗ trợ qua thẻ tín dụng và Game Club
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
