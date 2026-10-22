import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Field, cx, inputClass } from '../components/ui'
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
      const user = mode === 'login' ? await login(emailOrPhone, password) : await register(emailOrPhone, '', password, fullName)
      const destination = returnTo !== '/' ? returnTo : user.role === 'staff' ? '/admin' : '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (next: 'login' | 'register') => {
    setMode(next)
    setError(null)
  }

  const tabClass = (active: boolean) => cx(
    'flex-1 py-2 rounded-lg font-title-md text-title-md transition-colors cursor-pointer',
    active ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
  )

  return (
    <div className="max-w-[1280px] mx-auto px-margin md:px-margin-desktop py-space-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter-desktop items-stretch max-w-4xl mx-auto">
        <div className="hidden lg:flex flex-col justify-between rounded-xl p-space-xl bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary shadow-lg">
          <div className="space-y-space-sm">
            <p className="font-label-md text-label-md uppercase tracking-wider opacity-90">Chợ Tốt Mua</p>
            <h2 className="font-headline-xl text-headline-xl">Gaming gear chính hãng, giao nhanh tận tay.</h2>
          </div>
          <ul className="space-y-space-sm font-body-lg text-body-lg">
            {[['verified', 'Cam kết hàng chính hãng 100%'], ['local_shipping', 'Theo dõi đơn hàng mọi lúc'], ['redeem', 'Tích điểm & nhận voucher độc quyền']].map(([icon, text]) => (
              <li key={icon} className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined">{icon}</span>{text}
              </li>
            ))}
          </ul>
        </div>

        <Card className="!p-space-xl space-y-space-lg">
          <div className="space-y-space-xs">
            <p className="font-label-md text-label-md text-primary uppercase">Chợ Tốt Mua</p>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{mode === 'login' ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản mới'}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{mode === 'login' ? 'Đăng nhập để theo dõi đơn hàng và lưu sản phẩm.' : 'Chỉ mất một phút để bắt đầu mua sắm.'}</p>
          </div>

          <div className="flex gap-1 p-1 rounded-lg bg-surface-container" role="tablist" aria-label="Đăng nhập hoặc đăng ký">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={tabClass(mode === 'login')} onClick={() => switchMode('login')}>Đăng nhập</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={tabClass(mode === 'register')} onClick={() => switchMode('register')}>Đăng ký</button>
          </div>

          <form className="space-y-space-md" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <Field label="Họ và tên">
                <input type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </Field>
            )}
            <Field label={mode === 'login' ? 'Email hoặc số điện thoại' : 'Email'}>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                autoComplete={mode === 'login' ? 'username' : 'email'}
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Mật khẩu" hint={mode === 'register' ? 'Mật khẩu có ít nhất 8 ký tự, gồm chữ và số.' : undefined}>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>
            {mode === 'register' && (
              <Field label="Nhập lại mật khẩu">
                <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
              </Field>
            )}

            {error && <Alert>{error}</Alert>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
