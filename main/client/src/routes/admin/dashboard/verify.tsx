import { createFileRoute } from '@tanstack/react-router'
import AdminDashboard from '../../../components/adminDashboard'
import { useState } from 'react'

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
  const [selectedClaim, setSelectedClaim] = useState<VerifyRow | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)

  const handleReviewClick = (row: VerifyRow) => {
    setSelectedClaim(row)
    setIsFormVisible(true)
  }

  const handleCloseForm = () => {
    setIsFormVisible(false)
    setSelectedClaim(null)
  }

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
                <td>
                  <span className="review-link" onClick={() => handleReviewClick(row)}>
                    Review
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {isFormVisible && selectedClaim && (
        <div className="popup-form-overlay">
          <div className="popup-form-content">
            <h2>Review Claim: {selectedClaim.id}</h2>

            <form className="popup-form">
              <div className="form-group">
                <label htmlFor="claimItem">Item:</label>
                <input id="claimItem" type="text" value={selectedClaim.item} readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="claimant">Claimant:</label>
                <input id="claimant" type="text" value={selectedClaim.claimant} readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="submittedDate">Submitted:</label>
                <input id="submittedDate" type="text" value={selectedClaim.submitted} readOnly />
              </div>
              <div className="form-group">
                <label>Status:</label>
                <input
                  type="text"
                  value={selectedClaim.status === 'claimed' ? 'Pending' : 'Resolved'}
                  readOnly
                />
              </div>

              <div className="form-actions">
                <button type="button" className="accept-btn">
                  Accept
                </button>
                <button type="button" className="reject-btn">
                  Reject
                </button>
                <button type="button" className="close-btn" onClick={handleCloseForm}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminDashboard>
  )
}