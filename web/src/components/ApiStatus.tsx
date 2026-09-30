import { useEffect, useState } from 'react'
import { API_BASE } from '../lib/api'

type Status = 'checking' | 'up' | 'down'

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
    <span className={`api-status api-status--${status}`}>
      <span className="api-status__dot" aria-hidden="true" />
      {label}
    </span>
  )
}
