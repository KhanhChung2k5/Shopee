import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-7) 0', textAlign: 'center' }}>
      <h1 className="section-title">404 — Không tìm thấy trang</h1>
      <p style={{ color: 'var(--color-muted-foreground)', marginBottom: 'var(--space-4)' }}>
        Trang bạn tìm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link className="button button--primary" to="/">Về trang chủ</Link>
    </div>
  )
}
