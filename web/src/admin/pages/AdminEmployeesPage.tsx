import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../state/AuthContext'
import { apiFetch, ApiError } from '../../lib/api'

type Department = 'sales' | 'warehouse' | 'admin' | 'cs'

interface Employee {
  id: string
  userId: string
  email: string
  fullName: string | null
  department: Department
  position: string | null
  baseSalary: number | null
  hiredAt: string | null
}

const DEPARTMENT_LABEL: Record<Department, string> = {
  sales: 'Bán hàng',
  warehouse: 'Kho vận',
  admin: 'Quản trị',
  cs: 'CSKH',
}

const DEPT_FILTERS: { value: Department | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'sales', label: 'Bán hàng' },
  { value: 'warehouse', label: 'Kho vận' },
  { value: 'cs', label: 'CSKH' },
  { value: 'admin', label: 'Quản trị' },
]

const EMPTY_CREATE_FORM = { email: '', phone: '', password: '', fullName: '', department: 'sales' as Department, position: '' }

export default function AdminEmployeesPage() {
  const { token, user } = useAuth()
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ department: 'sales' as Department, position: '' })

  const refresh = () => {
    if (!token) return
    apiFetch<Employee[]>('/employees', {}, token)
      .then((data) => {
        setEmployees(data)
        setLoadError(null)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách nhân viên'))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const filtered = useMemo(
    () => employees.filter((e) => deptFilter === 'all' || e.department === deptFilter),
    [employees, deptFilter],
  )

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    try {
      await apiFetch(
        '/employees',
        {
          method: 'POST',
          body: JSON.stringify({ ...createForm, phone: createForm.phone || null, position: createForm.position || null }),
        },
        token,
      )
      setCreateForm(EMPTY_CREATE_FORM)
      setShowCreateForm(false)
      refresh()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Tạo nhân viên thất bại')
    }
  }

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id)
    setEditForm({ department: employee.department, position: employee.position ?? '' })
  }

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      await apiFetch(
        `/employees/${editingId}`,
        { method: 'PATCH', body: JSON.stringify({ department: editForm.department, position: editForm.position || null }) },
        token,
      )
      setEditingId(null)
      refresh()
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Cập nhật nhân viên thất bại')
    }
  }

  // Access is already enforced by RequireDepartment at the route level
  // (App.tsx), which reads the allowed departments from admin/access.ts.

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>
          Nhân viên ({filtered.length}/{employees.length})
        </h1>
        <button type="button" className="button button--primary" onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? 'Đóng' : '+ Thêm nhân viên'}
        </button>
      </div>

      {loadError && <p style={{ color: 'var(--color-urgent)' }}>{loadError}</p>}

      {showCreateForm && (
        <form
          onSubmit={submitCreate}
          className="checkout-section"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Họ tên
            <input
              className="search__input"
              required
              value={createForm.fullName}
              onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
              style={{ paddingInline: 16, position: 'static' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Email
            <input
              className="search__input"
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              style={{ paddingInline: 16, position: 'static' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Mật khẩu tạm
            <input
              className="search__input"
              type="password"
              required
              minLength={6}
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              style={{ paddingInline: 16, position: 'static' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Bộ phận
            <select
              className="search__input"
              value={createForm.department}
              onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value as Department }))}
              style={{ paddingInline: 16, position: 'static' }}
            >
              {(['sales', 'warehouse', 'admin', 'cs'] as Department[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Chức danh
            <input
              className="search__input"
              value={createForm.position}
              onChange={(e) => setCreateForm((f) => ({ ...f, position: e.target.value }))}
              style={{ paddingInline: 16, position: 'static' }}
            />
          </label>
          {createError && <p style={{ color: 'var(--color-urgent)', gridColumn: '1 / -1', margin: 0 }}>{createError}</p>}
          <button className="button button--primary" type="submit" style={{ gridColumn: '1 / -1', justifySelf: 'start' }}>
            Tạo nhân viên
          </button>
        </form>
      )}

      <div className="filter-bar">
        {DEPT_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`filter-chip${deptFilter === f.value ? ' filter-chip--active' : ''}`}
            onClick={() => setDeptFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Bộ phận</th>
              <th>Chức danh</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) =>
              editingId === emp.id ? (
                <tr key={emp.id}>
                  <td colSpan={5}>
                    <form onSubmit={submitEdit} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <strong>{emp.fullName ?? emp.email}</strong>
                      <select
                        className="search__input"
                        value={editForm.department}
                        onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value as Department }))}
                        style={{ paddingInline: 12, position: 'static', width: 160 }}
                      >
                        {(['sales', 'warehouse', 'admin', 'cs'] as Department[]).map((d) => (
                          <option key={d} value={d}>
                            {DEPARTMENT_LABEL[d]}
                          </option>
                        ))}
                      </select>
                      <input
                        className="search__input"
                        placeholder="Chức danh"
                        value={editForm.position}
                        onChange={(e) => setEditForm((f) => ({ ...f, position: e.target.value }))}
                        style={{ paddingInline: 12, position: 'static', width: 180 }}
                      />
                      <button className="button button--primary" type="submit">
                        Lưu
                      </button>
                      <button type="button" className="button button--outline" onClick={() => setEditingId(null)}>
                        Huỷ
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={emp.id}>
                  <td>{emp.fullName ?? '—'}</td>
                  <td>{emp.email}</td>
                  <td>{DEPARTMENT_LABEL[emp.department]}</td>
                  <td>{emp.position ?? '—'}</td>
                  <td>
                    <button type="button" className="button button--outline" onClick={() => startEdit(emp)}>
                      Sửa
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginTop: 'var(--space-3)' }}>
        Đang đăng nhập với quyền: <code>{user?.role}</code>. Chỉ tài khoản thuộc bộ phận <code>admin</code> mới tạo/sửa được nhân viên
        (backend trả 403 nếu không đúng quyền).
      </p>
    </div>
  )
}
