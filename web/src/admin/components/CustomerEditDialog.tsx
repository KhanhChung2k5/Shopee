import { useState, type FormEvent } from 'react'
import { buttonClass, Modal } from '../../components/ui'
import { apiFetch, ApiError } from '../../lib/api'
import { useAuth } from '../../state/AuthContext'
import { a } from '../adminUi'
import type { Customer } from '../types/customer'

/** CSKH sửa thông tin khách (PUT /api/customers/{id}): họ tên, email, SĐT, giới tính, ngày sinh. */
export default function CustomerEditDialog({ customer, onClose, onSaved }: {
  customer: Customer
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const { token } = useAuth()
  const [fullName, setFullName] = useState(customer.fullName ?? '')
  const [email, setEmail] = useState(customer.email ?? '')
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [gender, setGender] = useState(customer.gender ?? '')
  const [dob, setDob] = useState(customer.dob ? customer.dob.slice(0, 10) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!fullName.trim() || !email.trim()) { setError('Họ tên và email là bắt buộc.'); return }
    if (phone.trim() && !/^0\d{9,10}$/.test(phone.trim())) { setError('Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.'); return }
    if (dob && new Date(dob) > new Date()) { setError('Ngày sinh không được ở tương lai.'); return }
    setSaving(true)
    setError('')
    try {
      await apiFetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || null, gender: gender || null, dob: dob || null }),
      }, token)
      onSaved(`Đã cập nhật thông tin "${fullName.trim()}"`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được thông tin khách hàng')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Sửa thông tin khách hàng" eyebrow={customer.fullName ?? 'Khách hàng'} onClose={onClose}
      footer={<>
        <button type="button" className={buttonClass('outline')} onClick={onClose}>Huỷ</button>
        <button type="submit" form="customer-edit-form" className={buttonClass('primary')} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </>}>
      <form id="customer-edit-form" className={a.formGrid + ' !mb-0 !grid-cols-1 sm:!grid-cols-2'} onSubmit={submit}>
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
        <label>Ngày sinh<input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} /></label>
        {error && <p role="alert" className="sm:col-span-2 font-body-md text-body-md text-error">{error}</p>}
      </form>
    </Modal>
  )
}
