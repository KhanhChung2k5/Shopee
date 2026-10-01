import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { apiFetch } from '../../lib/api'
import ProgramManager from '../marketing/ProgramManager'
import VoucherManager from '../marketing/VoucherManager'
import type { PromotionProgram, Voucher } from '../marketing/types'
import { errorMessage } from '../marketing/types'

async function fetchMarketingData(token: string) {
  const [programs, vouchers] = await Promise.all([
    apiFetch<PromotionProgram[]>('/marketing/programs', {}, token),
    apiFetch<Voucher[]>('/marketing/vouchers', {}, token),
  ])
  return { programs, vouchers }
}

export default function AdminMarketingPage() {
  const { token } = useAuth()
  const [programs, setPrograms] = useState<PromotionProgram[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    const data = await fetchMarketingData(token)
    setPrograms(data.programs)
    setVouchers(data.vouchers)
    setError(null)
  }, [token])

  useEffect(() => {
    if (!token) return
    let active = true
    fetchMarketingData(token)
      .then((data) => {
        if (!active) return
        setPrograms(data.programs)
        setVouchers(data.vouchers)
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause, 'Không tải được dữ liệu marketing'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token])

  return (
    <div>
      <h1>Marketing</h1>
      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
      {!loading && !error && token && (
        <>
          <ProgramManager token={token} programs={programs} onChanged={refresh} />
          <VoucherManager token={token} programs={programs} vouchers={vouchers} onChanged={refresh} />
        </>
      )}
    </div>
  )
}
