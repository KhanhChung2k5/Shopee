import { useState } from 'react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-6)', maxWidth: 420 }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          className={mode === 'login' ? 'button button--primary' : 'button button--outline'}
          onClick={() => setMode('login')}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'button button--primary' : 'button button--outline'}
          onClick={() => setMode('register')}
        >
          Đăng ký
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
          Email hoặc số điện thoại
          <input className="search__input" type="text" required style={{ paddingInline: 16, position: 'static' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
          Mật khẩu
          <input className="search__input" type="password" required style={{ paddingInline: 16, position: 'static' }} />
        </label>
        {mode === 'register' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Nhập lại mật khẩu
            <input className="search__input" type="password" required style={{ paddingInline: 16, position: 'static' }} />
          </label>
        )}
        <button className="button button--primary" type="submit" style={{ marginTop: 8 }}>
          {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
        <p style={{ fontSize: 12.5, color: 'var(--color-muted-foreground)', textAlign: 'center' }}>
          Đây là giao diện minh hoạ — chưa nối với API xác thực thật (Phase 1).
        </p>
      </form>
    </div>
  )
}
