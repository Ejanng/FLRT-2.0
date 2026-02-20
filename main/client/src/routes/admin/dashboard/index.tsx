import { createFileRoute } from '@tanstack/react-router'
import AdminDashboard from '../../../components/adminDashboard'

type ReportRow = {
  id: string
  item: string
  location: string
  date: string
  status: 'claimed' | 'resolved'
}

const rows: ReportRow[] = [
  { id: 'R-1001', item: 'Wallet', location: 'Library', date: '2026-02-12', status: 'resolved' },
  { id: 'R-1002', item: 'Umbrella', location: 'Cafeteria', date: '2026-02-13', status: 'claimed' },
  { id: 'R-1003', item: 'Phone', location: 'Lab 204', date: '2026-02-14', status: 'resolved' },
]

export const Route = createFileRoute('/admin/dashboard/')({
  component: AllReportsPage,
})

function AllReportsPage() {
  return (
    <AdminDashboard>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Item</th>
              <th>Location</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.item}</td>
                <td>{row.location}</td>
                <td>{row.date}</td>
                <td>
                  <span className={`status-badge ${row.status}`}>
                    {row.status === 'claimed' ? 'Claimed' : 'Resolved'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminDashboard>
  )
}