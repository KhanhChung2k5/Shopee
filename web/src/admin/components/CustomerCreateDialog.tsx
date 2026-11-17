import { useState, type FormEvent } from 'react'
import { buttonClass, Modal } from '../../components/ui'
import { apiFetch, ApiError } from '../../lib/api'
import { useAuth } from '../../state/AuthContext'
import { a } from '../adminUi'

export interface CreatedCustomer {
  id: string
  fullName: string
}

/** CSKH thêm khách thủ công (POST /api/customers) và đặt mật khẩu ban đầu; khách đăng nhập được ngay. */
export default function CustomerCreateDialog({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (customer: CreatedCustomer) => void
}) {
  const { token } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!fullName.trim() || !email.trim()) { setError('Họ tên và email là bắt buộc.'); return }
    if (phone.trim() && !/^0\d{9,10}$/.test(phone.trim())) { setError('Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.'); return }
    if (dob && new Date(dob) > new Date()) { setError('Ngày sinh không được ở tương lai.'); return }
    if (password.length < 8 || password.length > 72) { setError('Mật khẩu phải có từ 8 đến 72 ký tự.'); return }
    if (password !== confirmPassword) { setError('Mật khẩu nhập lại không khớp.'); return }
    setSaving(true)
    setError('')
    try {
      const created = await apiFetch<CreatedCustomer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          gender: gender || null,
          dob: dob || null,
          password,
        }),
      }, token)
      onCreated({ id: created.id, fullName: created.fullName || fullName.trim() })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không thêm được khách hàng')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Thêm khách hàng" eyebrow="Tạo thủ công" onClose={onClose}
      footer={<>
        <button type="button" className={buttonClass('outline')} onClick={onClose}>Huỷ</button>
        <button type="submit" form="customer-create-form" className={buttonClass('primary')} disabled={saving}>{saving ? 'Đang lưu…' : 'Thêm khách hàng'}</button>
      </>}>
      <form id="customer-create-form" className={a.formGrid + ' !mb-0 !grid-cols-1 sm:!grid-cols-2'} onSubmit={submit}>
        <label className="sm:col-span-2">Họ tên<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label className="sm:col-span-2">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Số điện thoại<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" /></label>
        <label>Giới tính
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">— Chưa rõ —</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </label>
        <label className="sm:col-span-2">Ngày sinh<input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} /></label>
        <label>Mật khẩu
          <input required type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 8 ký tự" />
        </label>
        <label>Nhập lại mật khẩu
          <input required type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72}
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </label>
        <label className="sm:col-span-2 !flex-row items-center gap-space-xs">
          <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Hiện mật khẩu
        </label>
        <p className="sm:col-span-2 font-body-md text-body-md text-on-surface-variant">Khách đăng nhập được ngay bằng email hoặc SĐT và mật khẩu này, rồi tự đổi mật khẩu trong trang hồ sơ.</p>
        {error && <p role="alert" className="sm:col-span-2 font-body-md text-body-md text-error">{error}</p>}
      </form>
    </Modal>
  )
}
