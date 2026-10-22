import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../state/AuthContext'
import { apiFetch, ApiError } from '../../lib/api'
import { a, chipClass } from '../adminUi'
import { buttonClass } from '../../components/ui'

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
      <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-md">
        <h1>
          Nhân viên ({filtered.length}/{employees.length})
        </h1>
        <button type="button" className={buttonClass('primary')} onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? 'Đóng' : '+ Thêm nhân viên'}
        </button>
      </div>

      {loadError && <p className="font-body-md text-body-md text-error mb-space-md">{loadError}</p>}

      {showCreateForm && (
        <form
          onSubmit={submitCreate}
          className={`${a.card} grid grid-cols-1 md:grid-cols-2 gap-space-md mb-space-lg`}
        >
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
            Họ tên
            <input
              className={a.input}
              required
              value={createForm.fullName}
              onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
            Email
            <input
              className={a.input}
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
            Mật khẩu tạm
            <input
              className={a.input}
              type="password"
              required
              minLength={6}
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
            Bộ phận
            <select
              className={a.input}
              value={createForm.department}
              onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value as Department }))}
            >
              {(['sales', 'warehouse', 'admin', 'cs'] as Department[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
            Chức danh
            <input
              className={a.input}
              value={createForm.position}
              onChange={(e) => setCreateForm((f) => ({ ...f, position: e.target.value }))}
            />
          </label>
          {createError && <p className="col-span-full font-body-md text-body-md text-error">{createError}</p>}
          <button className={buttonClass('primary', 'md', 'col-span-full justify-self-start')} type="submit">
            Tạo nhân viên
          </button>
        </form>
      )}

      <div className={`${a.filterBar} mb-space-md`}>
        {DEPT_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={chipClass(deptFilter === f.value)}
            onClick={() => setDeptFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={a.tableWrap}>
        <table className={a.table}>
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
                    <form onSubmit={submitEdit} className="flex flex-wrap items-center gap-space-sm">
                      <strong>{emp.fullName ?? emp.email}</strong>
                      <select
                        className={`${a.input} !w-40`}
                        value={editForm.department}
                        onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value as Department }))}
                      >
                        {(['sales', 'warehouse', 'admin', 'cs'] as Department[]).map((d) => (
                          <option key={d} value={d}>
                            {DEPARTMENT_LABEL[d]}
                          </option>
                        ))}
                      </select>
                      <input
                        className={`${a.input} !w-44`}
                        placeholder="Chức danh"
                        value={editForm.position}
                        onChange={(e) => setEditForm((f) => ({ ...f, position: e.target.value }))}
                      />
                      <button className={buttonClass('primary')} type="submit">
                        Lưu
                      </button>
                      <button type="button" className={buttonClass('outline')} onClick={() => setEditingId(null)}>
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
                    <button type="button" className={buttonClass('outline')} onClick={() => startEdit(emp)}>
                      Sửa
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">
        Đang đăng nhập với quyền: <code>{user?.role}</code>. Chỉ tài khoản thuộc bộ phận <code>admin</code> mới tạo/sửa được nhân viên
        (backend trả 403 nếu không đúng quyền).
      </p>
    </div>
  )
}
