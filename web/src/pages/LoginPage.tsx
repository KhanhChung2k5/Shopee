import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-6)', maxWidth: 420 }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          className={mode === 'login' ? 'button button--primary' : 'button button--outline'}
          onClick={() => {
            setMode('login')
            setError(null)
          }}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'button button--primary' : 'button button--outline'}
          onClick={() => {
            setMode('register')
            setError(null)
          }}
        >
          Đăng ký
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {mode === 'register' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Họ và tên
            <input
              className="search__input"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ paddingInline: 16, position: 'static' }}
            />
          </label>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
          {mode === 'login' ? 'Email hoặc số điện thoại' : 'Email'}
          <input
            className="search__input"
            type={mode === 'login' ? 'text' : 'email'}
            required
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            style={{ paddingInline: 16, position: 'static' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
          Mật khẩu
          <input
            className="search__input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingInline: 16, position: 'static' }}
          />
        </label>
        {mode === 'register' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Nhập lại mật khẩu
            <input
              className="search__input"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingInline: 16, position: 'static' }}
            />
          </label>
        )}

        {error && (
          <p style={{ fontSize: 13, color: 'var(--color-urgent)', margin: 0 }} role="alert">
            {error}
          </p>
        )}

        <button className="button button--primary" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
          {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
    </div>
  )
}
