import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
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

const EMPTY_ADDRESS_FORM = { recipientName: '', phone: '', fullAddress: '', isDefault: false }

export default function ProfilePage() {
  const { token, user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />
  }

  return <ProfilePageContent token={token as string} logout={logout} isBuyer={user?.role === 'buyer'} />
}

function ProfilePageContent({ token, logout, isBuyer }: { token: string; logout: () => void; isBuyer: boolean }) {
  const [tab, setTab] = useState<'profile' | 'addresses' | 'wallet' | 'loyalty'>('profile')

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

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-6)', maxWidth: 640 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <button
            type="button"
            className={tab === 'profile' ? 'button button--primary' : 'button button--outline'}
            onClick={() => setTab('profile')}
          >
            Hồ sơ cá nhân
          </button>
          <button
            type="button"
            className={tab === 'addresses' ? 'button button--primary' : 'button button--outline'}
            onClick={() => setTab('addresses')}
          >
            Địa chỉ giao hàng
          </button>
          {isBuyer && (
            <>
              <button
                type="button"
                className={tab === 'wallet' ? 'button button--primary' : 'button button--outline'}
                onClick={() => setTab('wallet')}
              >
                Ví của tôi
              </button>
              <button
                type="button"
                className={tab === 'loyalty' ? 'button button--primary' : 'button button--outline'}
                onClick={() => setTab('loyalty')}
              >
                Điểm thành viên
              </button>
            </>
          )}
        </div>
        <button type="button" className="button button--outline" onClick={logout}>
          Đăng xuất
        </button>
      </div>

      {tab === 'profile' && (
        <div className="checkout-section">
          <h2 className="checkout-section__title">Thông tin cá nhân</h2>
          {profile ? (
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
                Email
                <input className="search__input" type="text" value={profile.email} disabled style={{ paddingInline: 16, position: 'static' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
                Họ và tên
                <input
                  className="search__input"
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                  style={{ paddingInline: 16, position: 'static' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
                Giới tính
                <select
                  className="search__input"
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))}
                  style={{ paddingInline: 16, position: 'static' }}
                >
                  <option value="">Không xác định</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
                Ngày sinh
                <input
                  className="search__input"
                  type="date"
                  value={profileForm.dob}
                  onChange={(e) => setProfileForm((f) => ({ ...f, dob: e.target.value }))}
                  style={{ paddingInline: 16, position: 'static' }}
                />
              </label>

              {profileError && <p style={{ fontSize: 13, color: 'var(--color-urgent)', margin: 0 }}>{profileError}</p>}
              {profileSaved && <p style={{ fontSize: 13, color: 'var(--color-trust)', margin: 0 }}>Đã lưu thay đổi.</p>}

              <button className="button button--primary" type="submit" style={{ alignSelf: 'flex-start' }}>
                Lưu thay đổi
              </button>
            </form>
          ) : (
            <p>{profileError ?? 'Đang tải...'}</p>
          )}
        </div>
      )}

      {tab === 'addresses' && (
        <>
          <div className="checkout-section">
            <h2 className="checkout-section__title">{editingId ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h2>
            <form onSubmit={saveAddress} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
                Tên người nhận
                <input
                  className="search__input"
                  type="text"
                  required
                  value={addressForm.recipientName}
                  onChange={(e) => setAddressForm((f) => ({ ...f, recipientName: e.target.value }))}
                  style={{ paddingInline: 16, position: 'static' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
                Số điện thoại
                <input
                  className="search__input"
                  type="text"
                  required
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                  style={{ paddingInline: 16, position: 'static' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
                Địa chỉ đầy đủ
                <input
                  className="search__input"
                  type="text"
                  required
                  value={addressForm.fullAddress}
                  onChange={(e) => setAddressForm((f) => ({ ...f, fullAddress: e.target.value }))}
                  style={{ paddingInline: 16, position: 'static' }}
                />
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                Đặt làm địa chỉ mặc định
              </label>

              {addressError && <p style={{ fontSize: 13, color: 'var(--color-urgent)', margin: 0 }}>{addressError}</p>}

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="button button--primary" type="submit">
                  {editingId ? 'Cập nhật' : 'Thêm địa chỉ'}
                </button>
                {editingId && (
                  <button className="button button--outline" type="button" onClick={resetAddressForm}>
                    Huỷ
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="checkout-section">
            <h2 className="checkout-section__title">Địa chỉ đã lưu</h2>
            {addresses.length === 0 && <p style={{ color: 'var(--color-muted-foreground)' }}>Chưa có địa chỉ nào.</p>}
            {addresses.map((address) => (
              <div key={address.id} className="radio-card">
                <div style={{ flex: 1 }}>
                  <p className="radio-card__title">
                    {address.recipientName} · {address.phone}
                    {address.isDefault && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-trust)', fontWeight: 700 }}>MẶC ĐỊNH</span>
                    )}
                  </p>
                  <p className="radio-card__desc">{address.fullAddress}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="button button--outline" onClick={() => startEditAddress(address)}>
                    Sửa
                  </button>
                  <button type="button" className="button button--outline" onClick={() => deleteAddress(address.id)}>
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'wallet' && isBuyer && <WalletPanel token={token} />}
      {tab === 'loyalty' && isBuyer && <LoyaltyPanel token={token} />}
    </div>
  )
}
