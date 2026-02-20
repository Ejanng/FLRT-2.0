import { createFileRoute } from '@tanstack/react-router'
import AdminDashboard from '../../../components/adminDashboard'


type ReportRow = {
  id: string
  item: string
  reporter: string
  date: string
  status: 'claimed' | 'resolved'
}

const rows: ReportRow[] = [
  { id: 'REP-201', item: 'Laptop Charger', reporter: 'Mila S.', date: '2026-02-10', status: 'claimed' },
  { id: 'REP-202', item: 'Backpack', reporter: 'Jon D.', date: '2026-02-11', status: 'resolved' },
  { id: 'REP-203', item: 'Earbuds', reporter: 'Kai R.', date: '2026-02-14', status: 'claimed' },
]

export const Route = createFileRoute('/admin/dashboard/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  return (
    <AdminDashboard>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
            <th>Item</th>
            <th>Reporter</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.item}</td>
              <td>{row.reporter}</td>
              <td>{row.date}</td>
              <td>
                <span className={`status-badge ${row.status}`}>
                  {row.status === 'claimed' ? 'Claimed' : 'Resolved'}
                </span>
              </td>
              <td>View</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
     </AdminDashboard>
  )
}