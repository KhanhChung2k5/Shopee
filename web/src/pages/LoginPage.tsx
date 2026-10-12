import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { ApiError } from '../lib/api'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(emailOrPhone, password)
      } else {
        await register(emailOrPhone, '', password, fullName)
      }
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <div className="auth-card__intro">
          <p>Chợ Tốt Mua</p>
          <h1>{mode === 'login' ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản mới'}</h1>
          <span>{mode === 'login' ? 'Đăng nhập để theo dõi đơn hàng và lưu sản phẩm.' : 'Chỉ mất một phút để bắt đầu mua sắm.'}</span>
        </div>
      <div className="auth-tabs" role="tablist" aria-label="Đăng nhập hoặc đăng ký">
        <button
          type="button"
          className={`auth-tabs__button${mode === 'login' ? ' auth-tabs__button--active' : ''}`}
          onClick={() => {
            setMode('login')
            setError(null)
          }}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          className={`auth-tabs__button${mode === 'register' ? ' auth-tabs__button--active' : ''}`}
          onClick={() => {
            setMode('register')
            setError(null)
          }}
        >
          Đăng ký
        </button>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <label className="form-field">
            Họ và tên
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-field__input"
            />
          </label>
        )}
        <label className="form-field">
          {mode === 'login' ? 'Email hoặc số điện thoại' : 'Email'}
          <input
            type={mode === 'login' ? 'text' : 'email'}
            required
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            className="form-field__input"
          />
        </label>
        <label className="form-field">
          Mật khẩu
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-field__input"
          />
        </label>
        {mode === 'register' && (
          <label className="form-field">
            Nhập lại mật khẩu
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-field__input"
            />
          </label>
        )}

        {error && (
          <p style={{ fontSize: 13, color: 'var(--color-urgent)', margin: 0 }} role="alert">
            {error}
          </p>
        )}

        <button className="button button--primary auth-card__submit" type="submit" disabled={submitting}>
          {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
      </div>
    </div>
  )
}
