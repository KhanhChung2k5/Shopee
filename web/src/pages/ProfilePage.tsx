import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardTitle, Field, Loading, Page, cx, inputClass } from '../components/ui'
import { useAuth } from '../state/AuthContext'
import { apiFetch, ApiError } from '../lib/api'
import WalletPanel from './WalletPanel'
import LoyaltyPanel from './LoyaltyPanel'

interface UserProfile {
  id: string
  email: string
  phone: string | null
  fullName: string | null
  avatarUrl: string | null
  gender: string | null
  dob: string | null
  role: string
}

interface Address {
  id: string
  recipientName: string
  phone: string
  fullAddress: string
  isDefault: boolean
}

type Tab = 'profile' | 'addresses' | 'wallet' | 'loyalty'

const EMPTY_ADDRESS_FORM = { recipientName: '', phone: '', fullAddress: '', isDefault: false }

export default function ProfilePage() {
  const { token, user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />
  }

  return <ProfilePageContent token={token as string} logout={logout} isBuyer={user?.role === 'buyer'} />
}

function ProfilePageContent({ token, logout, isBuyer }: { token: string; logout: () => void; isBuyer: boolean }) {
  const [tab, setTab] = useState<Tab>('profile')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({ fullName: '', gender: '', dob: '' })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<UserProfile>('/users/me', {}, token)
      .then((data) => {
        setProfile(data)
        setProfileForm({ fullName: data.fullName ?? '', gender: data.gender ?? '', dob: data.dob ?? '' })
      })
      .catch(() => setProfileError('Không tải được hồ sơ'))

    refreshAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAddresses = () => {
    apiFetch<Address[]>('/addresses', {}, token)
      .then(setAddresses)
      .catch(() => setAddressError('Không tải được danh sách địa chỉ'))
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSaved(false)
    try {
      const updated = await apiFetch<UserProfile>(
        '/users/me',
        {
          method: 'PATCH',
          body: JSON.stringify({
            fullName: profileForm.fullName,
            avatarUrl: profile?.avatarUrl ?? null,
            gender: profileForm.gender || null,
            dob: profileForm.dob || null,
          }),
        },
        token,
      )
      setProfile(updated)
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Lưu hồ sơ thất bại')
    }
  }

  const startEditAddress = (address: Address) => {
    setEditingId(address.id)
    setAddressForm({
      recipientName: address.recipientName,
      phone: address.phone,
      fullAddress: address.fullAddress,
      isDefault: address.isDefault,
    })
  }

  const resetAddressForm = () => {
    setEditingId(null)
    setAddressForm(EMPTY_ADDRESS_FORM)
  }

  const saveAddress = async (e: FormEvent) => {
    e.preventDefault()
    setAddressError(null)
    try {
      if (editingId) {
        await apiFetch<Address>(`/addresses/${editingId}`, { method: 'PUT', body: JSON.stringify(addressForm) }, token)
      } else {
        await apiFetch<Address>('/addresses', { method: 'POST', body: JSON.stringify(addressForm) }, token)
      }
      resetAddressForm()
      refreshAddresses()
    } catch (err) {
      setAddressError(err instanceof ApiError ? err.message : 'Lưu địa chỉ thất bại')
    }
  }

  const deleteAddress = async (id: string) => {
    try {
      await apiFetch(`/addresses/${id}`, { method: 'DELETE' }, token)
      if (editingId === id) resetAddressForm()
      refreshAddresses()
    } catch (err) {
      setAddressError(err instanceof ApiError ? err.message : 'Xoá địa chỉ thất bại')
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'person' },
    { id: 'addresses', label: 'Địa chỉ giao hàng', icon: 'location_on' },
    ...(isBuyer ? [
      { id: 'wallet' as const, label: 'Ví của tôi', icon: 'account_balance_wallet' },
      { id: 'loyalty' as const, label: 'Điểm thành viên', icon: 'loyalty' },
    ] : []),
  ]
  const displayName = profile?.fullName?.trim() || profile?.email || 'Tài khoản'

  return (
    <Page>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        <Card as="aside" className="lg:col-span-3 lg:sticky lg:top-44 !p-space-md space-y-space-md">
          <div className="flex items-center gap-space-sm px-space-xs">
            <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-headline-md text-headline-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-title-md text-title-md text-on-surface truncate">{displayName}</p>
              {profile && <p className="font-label-md text-label-md text-on-surface-variant truncate">{profile.email}</p>}
            </div>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto" role="tablist" aria-label="Quản lý tài khoản">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={cx(
                  'flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-title-md text-title-md whitespace-nowrap transition-colors cursor-pointer text-left',
                  tab === item.id ? 'bg-primary-fixed text-on-primary-fixed' : 'text-on-surface hover:bg-surface-container',
                )}
                onClick={() => setTab(item.id)}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <Link className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-title-md text-title-md whitespace-nowrap text-on-surface hover:bg-surface-container" to="/don-hang">
              <span className="material-symbols-outlined text-xl">receipt_long</span>Đơn mua
            </Link>
            <Link className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-title-md text-title-md whitespace-nowrap text-on-surface hover:bg-surface-container" to="/kho-voucher">
              <span className="material-symbols-outlined text-xl">confirmation_number</span>Kho voucher
            </Link>
            <Link className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-title-md text-title-md whitespace-nowrap text-on-surface hover:bg-surface-container" to="/thong-bao">
              <span className="material-symbols-outlined text-xl">notifications</span>Thông báo
            </Link>
            <Link className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-title-md text-title-md whitespace-nowrap text-on-surface hover:bg-surface-container" to="/ho-tro">
              <span className="material-symbols-outlined text-xl">support_agent</span>Hỗ trợ
            </Link>
          </nav>

          <Button variant="outline" className="w-full" icon="logout" onClick={logout}>Đăng xuất</Button>
        </Card>

        <div className="lg:col-span-9 space-y-space-md">
          {tab === 'profile' && (
            <Card as="section">
              <CardTitle icon="person">Thông tin cá nhân</CardTitle>
              {profile ? (
                <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <Field label="Email" className="md:col-span-2">
                    <input className={inputClass} type="text" value={profile.email} disabled />
                  </Field>
                  <Field label="Họ và tên" className="md:col-span-2">
                    <input
                      className={inputClass}
                      type="text"
                      autoComplete="name"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                    />
                  </Field>
                  <Field label="Giới tính">
                    <select className={inputClass} value={profileForm.gender} onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))}>
                      <option value="">Không xác định</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </Field>
                  <Field label="Ngày sinh">
                    <input className={inputClass} type="date" value={profileForm.dob} onChange={(e) => setProfileForm((f) => ({ ...f, dob: e.target.value }))} />
                  </Field>

                  <div className="md:col-span-2 space-y-space-sm">
                    {profileError && <Alert>{profileError}</Alert>}
                    {profileSaved && <Alert tone="success">Đã lưu thay đổi.</Alert>}
                    <Button type="submit" icon="save">Lưu thay đổi</Button>
                  </div>
                </form>
              ) : (
                profileError ? <Alert>{profileError}</Alert> : <Loading />
              )}
            </Card>
          )}

          {tab === 'addresses' && (
            <>
              <Card as="section">
                <CardTitle icon={editingId ? 'edit_location' : 'add_location'}>{editingId ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</CardTitle>
                <form onSubmit={saveAddress} className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <Field label="Tên người nhận">
                    <input className={inputClass} type="text" required autoComplete="name" value={addressForm.recipientName} onChange={(e) => setAddressForm((f) => ({ ...f, recipientName: e.target.value }))} />
                  </Field>
                  <Field label="Số điện thoại">
                    <input className={inputClass} type="tel" required autoComplete="tel" value={addressForm.phone} onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))} />
                  </Field>
                  <Field label="Địa chỉ đầy đủ" className="md:col-span-2">
                    <input className={inputClass} type="text" required autoComplete="street-address" value={addressForm.fullAddress} onChange={(e) => setAddressForm((f) => ({ ...f, fullAddress: e.target.value }))} />
                  </Field>
                  <label className="md:col-span-2 flex items-center gap-space-xs font-body-md text-body-md text-on-surface cursor-pointer">
                    <input className="w-4 h-4 accent-primary" type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))} />
                    Đặt làm địa chỉ mặc định
                  </label>

                  <div className="md:col-span-2 space-y-space-sm">
                    {addressError && <Alert>{addressError}</Alert>}
                    <div className="flex gap-space-sm">
                      <Button type="submit" icon={editingId ? 'save' : 'add'}>{editingId ? 'Cập nhật' : 'Thêm địa chỉ'}</Button>
                      {editingId && <Button variant="outline" onClick={resetAddressForm}>Huỷ</Button>}
                    </div>
                  </div>
                </form>
              </Card>

              <Card as="section">
                <CardTitle icon="home_pin">Địa chỉ đã lưu</CardTitle>
                {addresses.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">Chưa có địa chỉ nào.</p>}
                <div className="space-y-space-sm">
                  {addresses.map((address) => (
                    <div key={address.id} className={cx('flex flex-wrap items-start gap-space-md rounded-lg border p-space-md', editingId === address.id ? 'border-primary' : 'border-line')}>
                      <div className="flex-1 min-w-0">
                        <p className="flex flex-wrap items-center gap-space-xs font-title-md text-title-md text-on-surface">
                          {address.recipientName} · {address.phone}
                          {address.isDefault && <Badge tone="success">Mặc định</Badge>}
                        </p>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{address.fullAddress}</p>
                      </div>
                      <div className="flex gap-space-xs">
                        <Button variant="outline" size="sm" icon="edit" onClick={() => startEditAddress(address)}>Sửa</Button>
                        <Button variant="ghost" size="sm" icon="delete" onClick={() => deleteAddress(address.id)}>Xoá</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {tab === 'wallet' && isBuyer && <WalletPanel token={token} />}
          {tab === 'loyalty' && isBuyer && <LoyaltyPanel token={token} />}
        </div>
      </div>
    </Page>
  )
}
