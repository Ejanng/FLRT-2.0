// client/src/routes/admin/dashboard/verify.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CheckCircle, XCircle, Eye, Loader2, Check, User, FileText } from 'lucide-react'
import { claimsApi } from '../../../services/api'
import { requireAdminAuth } from '../../../utils/adminAuth'

const ITEMS_PER_PAGE = 8
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface Claim {
  claim_id: number
  report_id: number
  student_name: string
  student_number: string
  contact_info: string
  description: string
  status: string
  image?: string
  date_claimed: string
  report?: {
    item_name: string
    description: string
    location: string
    image?: string
    status?: string
    finder?: {
      name?: string
      student_number?: string
      contact_info?: string
      coordination_status?: string
    }
  }
}

export const Route = createFileRoute('/admin/dashboard/verify')({
  beforeLoad: () => {
    requireAdminAuth()
  },
  component: VerifyClaimsPage,
})

function VerifyClaimsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['pending-claims'],
    queryFn: claimsApi.getPending,
    refetchInterval: 10000,
  })

  const claims = claimsData?.claims || []
  const filteredClaims = claims.filter((claim: Claim) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(claim.claim_id).toLowerCase().includes(q) ||
      (claim.student_name || '').toLowerCase().includes(q) ||
      (claim.student_number || '').toLowerCase().includes(q) ||
      (claim.contact_info || '').toLowerCase().includes(q)
    )
  })
  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / ITEMS_PER_PAGE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = (currentPageSafe - 1) * ITEMS_PER_PAGE
  const paginatedClaims = filteredClaims.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const reviewMutation = useMutation({
    mutationFn: ({ claimId, action }: { claimId: number; action: 'approve' | 'reject' }) =>
      claimsApi.review(claimId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-claims'] })
      queryClient.invalidateQueries({ queryKey: ['all-claims'] })
      setMessage(`Claim ${variables.action}d successfully!`)
      setTimeout(() => {
        setIsModalOpen(false)
        setSelectedClaim(null)
        setMessage('')
      }, 1500)
    },
    
    onError: (error: any) => {
      setMessage(error.message || 'Failed to process claim')
    },
  })

  const handleView = (claim: Claim) => {
    setSelectedClaim(claim)
    setIsModalOpen(true)
    setMessage('')
  }

  const handleApprove = () => {
    if (!selectedClaim) return
    reviewMutation.mutate({ claimId: selectedClaim.claim_id, action: 'approve' })
  }

  const handleReject = () => {
    if (!selectedClaim) return
    if (!confirm('Are you sure you want to reject this claim?')) return
    reviewMutation.mutate({ claimId: selectedClaim.claim_id, action: 'reject' })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return 'https://via.placeholder.com/400x200?text=No+Image'

    if (imagePath.includes('drive.google.com')) {
      const fileIdFromPath = imagePath.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      let fileIdFromQuery: string | null = null
      try {
        fileIdFromQuery = new URL(imagePath).searchParams.get('id')
      } catch {
        fileIdFromQuery = null
      }
      const fileId = fileIdFromPath || fileIdFromQuery
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
      }
    }

    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE_URL}/reports/images/${encodeURIComponent(imagePath)}`
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto">
            <button 
              onClick={() => navigate({ to: '/admin/dashboard' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              All Reports
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-white text-sm font-medium whitespace-nowrap">
              Verify Claims
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/reports' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Manage Reports
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/found-items' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Found Items
            </button>
            <button
              onClick={() => navigate({ to: '/admin/dashboard/returned' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Returned Reports
            </button>
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Claims</h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Review and verify ownership claims from students
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="bg-[#f5e102] text-[#0217f7] px-3 py-1 rounded-full text-sm font-bold">
                    {filteredClaims.length} Pending
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                placeholder="Search by ID, name, student ID, or contact..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0217f7]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={48} className="animate-spin text-[#0217f7] dark:text-[#f5e102]" />
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No {search ? 'matching' : 'pending'} claims</p>
              <p className="text-sm">{search ? 'Try different search terms' : 'All claims have been processed!'}</p>
            </div>
          ) : (
            <div className="grid gap-4 p-6">
              {paginatedClaims.map((claim: Claim) => (
                <div 
                  key={claim.claim_id} 
                  className="bg-white dark:bg-[#1e1e2e] rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {claim.report?.image ? (
                        <img 
                          src={getImageUrl(claim.report.image)}
                          alt={claim.report.item_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <FileText size={32} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {claim.report?.item_name || 'Unknown Item'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Claim #{claim.claim_id} • Report #{claim.report_id}
                          </p>
                        </div>
                        {getStatusBadge(claim.status)}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <User size={14} className="text-[#0217f7] dark:text-[#f5e102]" />
                          <span className="truncate">{claim.student_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <span className="text-gray-400">ID:</span>
                          <span>{claim.student_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 sm:col-span-2">
                          <span className="text-gray-400">Contact:</span>
                          <span>{claim.contact_info}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-gray-400">
                          Claimed on {new Date(claim.date_claimed).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleView(claim)}
                          className="flex items-center gap-1 text-[#0217f7] dark:text-[#f5e102] hover:underline text-sm font-medium"
                        >
                          <Eye size={16} /> Review Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && claims.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, claims.length)} of {claims.length} claims
              </p>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPageSafe === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentPageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPageSafe === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Claim #{selectedClaim.claim_id}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                message.includes('success') 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {message.includes('success') ? <CheckCircle size={18} /> : <XCircle size={18} />}
                {message}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                  Item Details
                </h3>
                
                {selectedClaim.report?.image && (
                  <div className="rounded-xl overflow-hidden">
                    <img 
                      src={getImageUrl(selectedClaim.report.image)}
                      alt={selectedClaim.report.item_name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image'
                      }}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm"><span className="text-gray-500">Item:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedClaim.report?.item_name}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Location:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedClaim.report?.location}</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedClaim.report?.description}</p>
                </div>

                {selectedClaim.report?.finder && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold mb-2">Finder Information</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedClaim.report.finder.name || 'N/A'}</span></p>
                      <p><span className="text-gray-500">Student Number:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedClaim.report.finder.student_number || 'N/A'}</span></p>
                      <p><span className="text-gray-500">Contact:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedClaim.report.finder.contact_info || 'N/A'}</span></p>
                      <p><span className="text-gray-500">Coordination:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedClaim.report.finder.coordination_status || 'N/A'}</span></p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                  Claimant Information
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedClaim.student_name}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Student Number</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedClaim.student_number}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Contact</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedClaim.contact_info}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase mb-1">Proof of Ownership</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedClaim.description}</p>
                  </div>
                  
                  {selectedClaim.image && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase mb-2">Attached Image</p>
                      <img 
                        src={getImageUrl(selectedClaim.image)}
                        alt="Proof"
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
              >
                {reviewMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Approve & Return Item
              </button>
              <button
                onClick={handleReject}
                disabled={reviewMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {reviewMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                Reject Claim
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}