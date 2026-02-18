import { createFileRoute } from '@tanstack/react-router'
import AdminDashboard from '../../../components/adminDashboard'

type VerifyRow = {
  id: string
  item: string
  claimant: string
  submitted: string
  status: 'claimed' | 'resolved'
}

const rows: VerifyRow[] = [
  { id: 'CLM-901', item: 'Keys', claimant: 'Ana P.', submitted: '2026-02-12', status: 'claimed' },
  { id: 'CLM-902', item: 'Watch', claimant: 'Leo G.', submitted: '2026-02-13', status: 'claimed' },
  { id: 'CLM-903', item: 'Notebook', claimant: 'Ivy K.', submitted: '2026-02-15', status: 'resolved' },
]

export const Route = createFileRoute('/admin/dashboard/verify')({
  component: VerifyPage,
})

function VerifyPage() {
  return (
    <AdminDashboard>
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Claim ID</th>
            <th>Item</th>
            <th>Claimant</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.item}</td>
              <td>{row.claimant}</td>
              <td>{row.submitted}</td>
              <td>
                <span className={`status-badge ${row.status}`}>
                  {row.status === 'claimed' ? 'Pending' : 'Resolved'}
                </span>
              </td>
              <td>Review</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </AdminDashboard>
  )
}