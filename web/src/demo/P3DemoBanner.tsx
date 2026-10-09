import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { disableP3DemoMode, isP3DemoMode, resetP3DemoData } from './p3DemoApi'

/** Visible guardrail so fake integration data cannot be mistaken for real data. */
export default function P3DemoBanner() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  if (!isP3DemoMode()) return null

  const loginDemoBuyer = async () => {
    setIsLoggingIn(true)
    try {
      await login('p3.demo@chotomua.local', 'demo-only')
      navigate('/')
      window.location.reload()
    } finally {
      setIsLoggingIn(false)
    }
  }

  const reset = () => {
    resetP3DemoData()
    window.location.reload()
  }

  const disable = () => {
    disableP3DemoMode()
    resetP3DemoData()
    window.location.assign('/')
  }

  return (
    <aside className="p3-demo-banner" aria-label="Chế độ kiểm thử P3">
      <div>
        <strong>P3 DEMO</strong>
        <span>P1/P2/P4/P5 đang dùng dữ liệu giả cục bộ — không ghi vào backend.</span>
      </div>
      <div className="p3-demo-banner__actions">
        <button type="button" onClick={() => void loginDemoBuyer()} disabled={isLoggingIn}>
          {isLoggingIn ? 'Đang vào…' : 'Dùng buyer demo'}
        </button>
        <button type="button" onClick={reset}>Làm mới dữ liệu</button>
        <button type="button" onClick={disable}>Tắt demo</button>
      </div>
    </aside>
  )
}
