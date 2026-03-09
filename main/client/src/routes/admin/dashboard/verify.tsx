  import { createFileRoute } from '@tanstack/react-router'
  import AdminDashboard from '../../../components/adminDashboard'
  import { useEffect, useState } from 'react'

  type VerifyRow = {
  id: string
  item: string
  claimant: string
  student_number: string
  claimant_id: string
  description: string
  submitted: string
  status: 'claimed' | 'resolved'
  action: 'accepted' | 'rejected' | ''
}

  export const Route = createFileRoute('/admin/dashboard/verify')({
    component: VerifyPage,
  })

  function VerifyPage() {
  const [rows, setRows] = useState<VerifyRow[]>([])
  const [selectedClaim, setSelectedClaim] = useState<VerifyRow | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const handleReviewClick = (row: VerifyRow) => {
    setSelectedClaim(row)
    setIsFormVisible(true)
    setModalError('')
  }

  const handleCloseForm = () => {
    setIsFormVisible(false)
    setSelectedClaim(null)
    setModalError('')
  }

  const handleVerifyClaim = async (nextStatus: 'verified' | 'rejected') => {
    if (!selectedClaim) return

    try {
      setIsSubmitting(true)
      setModalError('')

      const token = localStorage.getItem('admin_token')
      if (!token) {
        setModalError('Missing admin token. Please login again.')
        return
      }

      const res = await fetch('http://localhost:5000/claims/verify-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          claim_id: Number(selectedClaim.id),
          status: nextStatus,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setModalError(data?.message || data?.error || 'Failed to update claim status.')
        return
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === selectedClaim.id
            ? {
                ...row,
                status: 'resolved',
                action: nextStatus === 'verified' ? 'accepted' : 'rejected',
              }
            : row
        )
      )

      handleCloseForm()
    } catch (error) {
      setModalError('Unable to verify claim right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }


  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const token = localStorage.getItem('admin_token')

        const endpoint = token
          ? 'http://localhost:5000/claims/all-claims'
          : 'http://localhost:5000/claims/all-claims-public'

        const res = await fetch(endpoint, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        })

        if (!res.ok) {
          throw new Error(`Failed to fetch claims: ${res.status}`)
        }

        const data = await res.json()

        const mapped: VerifyRow[] = (data.claims || []).map((c: any) => ({
          id: String(c.claim_id ?? c.report_id ?? ''),
          item: c.item_name || '',
          claimant: c.student_name || '',
          student_number: c.student_number,
          claimant_id: String(c.claim_id ?? ''),
          description: c.description || '',
          submitted: c.date_claimed ? new Date(c.date_claimed).toISOString().slice(0, 10) : '',
          status: c.status === 'pending' ? 'claimed' : 'resolved',
          action: c.status === 'verified' ? 'accepted' : c.status === 'rejected' ? 'rejected' : '',
        }))

        setRows(mapped)
      } catch (err) {
        console.error('Failed to fetch claims:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchClaims()
  }, [])

  if (loading) return <div>Loading claims...</div>


    return (
      <AdminDashboard>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Claim ID</th>
              <th>Item</th>
              <th>Claimant</th>
              <th>Student #</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Action</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>No claims available</td>
              </tr>
            ) : (
              rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.item}</td>
                <td>{row.claimant}</td>
                <td>{row.student_number}</td>
                <td>{row.submitted}</td>
                <td>
                  <span className={`status-badge ${row.status}`}>
                    {row.status === 'claimed' ? 'Pending' : 'Resolved'}
                  </span>
                </td>
                <td>{row.action}</td>
                <td>
                  <button
                    type="button"
                    className="review-link"
                    onClick={() => handleReviewClick(row)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
      {isFormVisible && selectedClaim && (
  <div className="popup-form-overlay">
    <div className="popup-form-content">
      <h2>Review Claim</h2>

      <form className="popup-form">
        {modalError ? <div className="admin-inline-message error">{modalError}</div> : null}
        <div className="form-group">
          <label>Claim ID</label>
          <input type="text" value={selectedClaim.id} readOnly />
        </div>

        <div className="form-group">
          <label>Item Name</label>
          <input type="text" value={selectedClaim.item} readOnly />
        </div>

        <div className="form-group">
          <label>Claimant Name</label>
          <input type="text" value={selectedClaim.claimant} readOnly />
        </div>

        <div className="form-group">
          <label>Student Number</label>
          <input type="text" value={selectedClaim.student_number} readOnly />
        </div>

        <div className="form-group">
          <label>Claimant ID</label>
          <input type="text" value={selectedClaim.claimant_id} readOnly />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            rows={4}
            value={selectedClaim.description}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Submitted Date</label>
          <input type="text" value={selectedClaim.submitted} readOnly />
        </div>

        <div className="form-group">
          <label>Status</label>
          <input
            type="text"
            value={selectedClaim.status === 'claimed' ? 'Pending' : 'Resolved'}
            readOnly
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="accept-btn"
            onClick={() => handleVerifyClaim('verified')}
            disabled={isSubmitting}
          >
            Accept
          </button>

          <button
            type="button"
            className="reject-btn"
            onClick={() => handleVerifyClaim('rejected')}
            disabled={isSubmitting}
          >
            Reject
          </button>

          <button
            type="button"
            className="close-btn"
            onClick={handleCloseForm}
          >
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