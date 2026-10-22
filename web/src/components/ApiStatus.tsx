import { useEffect, useState } from 'react'
import { API_BASE } from '../lib/api'

type Status = 'checking' | 'up' | 'down'

const DOT: Record<Status, string> = {
  checking: 'bg-outline animate-pulse',
  up: 'bg-secondary',
  down: 'bg-error',
}

export default function ApiStatus() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (!cancelled) setStatus(data.status === 'UP' ? 'up' : 'down')
      })
      .catch(() => {
        if (!cancelled) setStatus('down')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const label = status === 'checking' ? 'Đang kiểm tra API...' : status === 'up' ? 'API: hoạt động' : 'API: không kết nối được'

  return (
    <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm">
      <span className={`w-2 h-2 rounded-full ${DOT[status]}`} aria-hidden="true" />
      {label}
    </span>
  )
}
