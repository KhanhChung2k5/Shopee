import { useMemo, useState } from 'react'
import { INITIAL_EMPLOYEES, DEPARTMENT_LABEL, type Department } from '../data/sampleEmployees'

const DEPT_FILTERS: { value: Department | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'sales', label: 'Bán hàng' },
  { value: 'warehouse', label: 'Kho vận' },
  { value: 'cs', label: 'CSKH' },
  { value: 'admin', label: 'Quản trị' },
]

export default function AdminEmployeesPage() {
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all')

  const filtered = useMemo(
    () => INITIAL_EMPLOYEES.filter((e) => deptFilter === 'all' || e.department === deptFilter),
    [deptFilter],
  )

  return (
    <div>
      <h1>Nhân viên ({filtered.length}/{INITIAL_EMPLOYEES.length})</h1>

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
              <th>Ngày vào làm</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td>{e.fullName}</td>
                <td>{e.email}</td>
                <td>{DEPARTMENT_LABEL[e.department]}</td>
                <td>{e.position}</td>
                <td>{e.hiredAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginTop: 'var(--space-3)' }}>
        Dữ liệu minh hoạ — khi có auth thật, mỗi <code>Employee.department</code> sẽ chỉ thấy các mục sidebar tương ứng
        (vd nhân viên kho vận chỉ thấy mục "Kho hàng", không thấy "Khách hàng").
      </p>
    </div>
  )
}
