// client/src/routes/admin/dashboard/reports.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, CheckCircle, XCircle, Eye, Loader2, Check, Trash2, MessageSquare } from 'lucide-react'
import { reportsApi } from '../../../services/api'
import { requireAdminAuth } from '../../../utils/adminAuth'

const ITEMS_PER_PAGE = 10
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface Report {
  report_id: string
  item_name: string
  description: string
  location: string
  date_reported: string
  status: string
  image?: string
  category?: string
  finder_name?: string
  finder_contact_info?: string
  finder_student_number?: string
  is_found_report?: boolean
  coordination_status?: 'pending' | 'contacted' | 'verified'
  public_match_link?: string | null
  has_pending_claim?: boolean
  pending_claim_status?: string | null
}

export const Route = createFileRoute('/admin/dashboard/reports')({
  beforeLoad: () => {
    requireAdminAuth()
  },
  component: ReportsPage,
})

function ReportsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [coordinationNotes, setCoordinationNotes] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['all-reports'],
    queryFn: reportsApi.getAll,
  })

  const reports = (reportsData?.reports || []).filter(
    (report: Report) => !report.has_pending_claim && (report.status || '').toLowerCase() !== 'returned',
  )
  const filteredReports = reports.filter((report: Report) => {
    const q = search.trim().toLowerCase()
    if (!q) return true

    const reportId = String(report.report_id || '').toLowerCase()
    const itemName = (report.item_name || '').toLowerCase()
    const location = (report.location || '').toLowerCase()
    const dateRaw = String(report.date_reported || '').toLowerCase()
    const dateFormatted = report.date_reported
      ? new Date(report.date_reported).toLocaleDateString().toLowerCase()
      : ''

    return (
      reportId.includes(q) ||
      itemName.includes(q) ||
      location.includes(q) ||
      dateRaw.includes(q) ||
      dateFormatted.includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = (currentPageSafe - 1) * ITEMS_PER_PAGE
  const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const publishMutation = useMutation({
    mutationFn: ({ reportId, category }: { reportId: number; category: string }) => reportsApi.publish(reportId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-reports'] })
      queryClient.invalidateQueries({ queryKey: ['claimable-reports'] })
      setMessage('Report published successfully! Now visible in Claim page.')
      setTimeout(() => {
        setIsModalOpen(false)
        setSelectedReport(null)
        setMessage('')
      }, 1500)
    },
    onError: (error: any) => {
      setMessage(error.message || 'Failed to publish report')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => reportsApi.delete(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-reports'] })
      setMessage('Report rejected and deleted.')
      setTimeout(() => {
        setIsModalOpen(false)
        setSelectedReport(null)
        setMessage('')
      }, 1500)
    },
    onError: (error: any) => {
      setMessage(error.message || 'Failed to delete report')
    },
  })

  const contactFinderMutation = useMutation({
    mutationFn: ({ reportId, notes }: { reportId: number; notes: string }) =>
      reportsApi.contactFinderForFoundReport(reportId, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-reports'] })
      setSelectedReport(prev => prev ? { ...prev, coordination_status: 'contacted' } : null)
      setCoordinationNotes('')
      setMessage(`Finder contacted successfully for report #${variables.reportId}`)
    },
    onError: (error: any) => {
      setMessage(error.message || 'Failed to contact finder')
    },
  })

  const verifyCoordinationMutation = useMutation({
    mutationFn: ({ reportId, notes }: { reportId: number; notes?: string }) =>
      reportsApi.verifyFoundReportCoordination(reportId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-reports'] })
      setSelectedReport(prev => prev ? { ...prev, coordination_status: 'verified' } : null)
      setMessage('Finder coordination marked as verified. Ready to publish.')
    },
    onError: (error: any) => {
      setMessage(error.message || 'Failed to verify coordination')
    },
  })

  const handleView = (report: Report) => {
    setSelectedReport(report)
    setIsModalOpen(true)
    setMessage('')
    setCoordinationNotes('')
    setSelectedCategory(report.category || '')
  }

  const handleContactFinder = () => {
    if (!selectedReport || !selectedReport.is_found_report) {
      setMessage('This is not a found item report.')
      return
    }
    if (!coordinationNotes.trim()) {
      setMessage('Please enter coordination notes before contacting the finder')
      return
    }
    contactFinderMutation.mutate({
      reportId: Number(selectedReport.report_id),
      notes: coordinationNotes.trim(),
    })
  }

  const handleMarkVerified = () => {
    if (!selectedReport) return
    verifyCoordinationMutation.mutate({
      reportId: Number(selectedReport.report_id),
      notes: coordinationNotes.trim() || undefined,
    })
  }

  const handlePublish = () => {
    if (!selectedReport) return
    if ((selectedReport.status || '').toLowerCase() === 'returned') {
      setMessage('Returned reports cannot be published again. Review them in Returned Reports page.')
      return
    }
    if (!selectedCategory.trim()) {
      setMessage('Please select a category before publishing')
      return
    }
    publishMutation.mutate({
      reportId: parseInt(selectedReport.report_id),
      category: selectedCategory.trim(),
    })
  }

  const handleReject = () => {
    if (!selectedReport) return
    if (!confirm('Are you sure you want to reject and delete this report?')) return
    deleteMutation.mutate(selectedReport.report_id)
  }

  const getStatusBadge = (status: string) => {
    if (status.startsWith('published')) {
      return <span className="badge-yellow">Published</span>
    }
    if (status === 'pending') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>
  }

  const isPublished = (status: string) => status.startsWith('published')

  const getImageUrl = (imagePath: string) => {
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

  const getDrivePreviewUrl = (url: string) => {
    if (!url) return ''
    if (url.includes('drive.google.com')) {
      const fileIdFromPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      let fileIdFromQuery: string | null = null
      try {
        fileIdFromQuery = new URL(url).searchParams.get('id')
      } catch {
        fileIdFromQuery = null
      }
      const fileId = fileIdFromPath || fileIdFromQuery
      if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
    }
    return url
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
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/verify' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Verify Claims
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-white text-sm font-medium whitespace-nowrap">
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

          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search by ID, name, location, or date..."
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="animate-spin mx-auto text-[#0217f7]" size={24} />
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No matching reports found</td>
                  </tr>
                ) : (
                  paginatedReports.map((report: Report) => (
                    <tr key={report.report_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">#{report.report_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{report.item_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{report.description}</td>
                      <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(report.date_reported).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleView(report)}
                          className="flex items-center gap-1 text-[#0217f7] dark:text-[#f5e102] hover:underline text-sm font-medium"
                        >
                          <Eye size={16} /> Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredReports.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredReports.length)} of {filteredReports.length} reports
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

      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Report #{selectedReport.report_id}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                message.includes('success') || message.includes('Finder') || message.includes('verified')
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : message.includes('error') || message.includes('Please')
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {message.includes('error') || message.includes('Please') ? <XCircle size={18} /> : <CheckCircle size={18} />}
                {message}
              </div>
            )}

            <div className="space-y-4 mb-6">
              {selectedReport.image && (
                <div className="rounded-xl overflow-hidden">
                  <img 
                    src={getImageUrl(selectedReport.image)}
                    alt={selectedReport.item_name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image'
                    }}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Item</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.item_name}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{getStatusBadge(selectedReport.status)}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Location</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.location}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedReport.date_reported).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{selectedReport.description}</p>
              </div>

              {selectedReport.public_match_link && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase mb-1">Public Match Image</p>
                  <img
                    src={getDrivePreviewUrl(selectedReport.public_match_link)}
                    alt="Public match"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700 mb-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <a
                    href={selectedReport.public_match_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#0217f7] dark:text-[#f5e102] hover:underline break-all"
                  >
                    Open public match image
                  </a>
                </div>
              )}

              {!isPublished(selectedReport.status) && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase mb-2">Category (Required before publish)</p>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full input-field"
                  >
                    <option value="">Select category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Bags">Bags</option>
                    <option value="Books">Books</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              )}

              {selectedReport.is_found_report && (
                <div className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    Found Item - Coordination Required
                  </h3>
                  <div className="space-y-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded">
                      <p className="text-xs text-gray-500 uppercase mb-1">Finder Name</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.finder_name || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-800 rounded">
                      <p className="text-xs text-gray-500 uppercase mb-1">Finder Contact</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.finder_contact_info || 'N/A'}</p>
                    </div>
                    {selectedReport.finder_student_number && (
                      <div className="p-2 bg-white dark:bg-gray-800 rounded">
                        <p className="text-xs text-gray-500 uppercase mb-1">Student Number</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedReport.finder_student_number}</p>
                      </div>
                    )}
                    <div className="p-2 bg-white dark:bg-gray-800 rounded">
                      <p className="text-xs text-gray-500 uppercase mb-1">Coordination Status</p>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">
                        {selectedReport.coordination_status === 'verified' && <span className="text-green-600 dark:text-green-400">✓ Verified</span>}
                        {selectedReport.coordination_status === 'contacted' && <span className="text-blue-600 dark:text-blue-400">Contacted - Awaiting Confirmation</span>}
                        {!selectedReport.coordination_status || selectedReport.coordination_status === 'pending' && <span className="text-orange-600 dark:text-orange-400">Pending Contact</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedReport.is_found_report && (!selectedReport.coordination_status || selectedReport.coordination_status === 'pending') && (
              <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Coordinate with Finder</h3>
                <textarea
                  value={coordinationNotes}
                  onChange={(e) => setCoordinationNotes(e.target.value)}
                  placeholder="Enter coordination message or verification notes... (e.g., 'Please confirm item details', 'Verify item location', etc.)"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 resize-none h-20"
                />
                <button
                  onClick={handleContactFinder}
                  disabled={contactFinderMutation.isPending}
                  className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {contactFinderMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                  {contactFinderMutation.isPending ? 'Contacting Finder...' : 'Contact Finder'}
                </button>
              </div>
            )}

            {selectedReport.is_found_report && selectedReport.coordination_status === 'contacted' && (
              <div className="mb-6 p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <button
                  onClick={handleMarkVerified}
                  disabled={verifyCoordinationMutation.isPending}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {verifyCoordinationMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {verifyCoordinationMutation.isPending ? 'Verifying...' : 'Mark as Verified & Ready to Publish'}
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {!isPublished(selectedReport.status) ? (
                <>
                  <button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending || contactFinderMutation.isPending || verifyCoordinationMutation.isPending || !selectedCategory.trim() || (selectedReport.is_found_report && selectedReport.coordination_status !== 'verified')}
                    title={selectedReport.is_found_report && selectedReport.coordination_status !== 'verified' ? 'Must verify with finder before publishing' : ''}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {publishMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Approve & Publish
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={deleteMutation.isPending}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    Reject & Delete
                  </button>
                </>
              ) : (
                <div className="w-full p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-center font-medium">
                  <CheckCircle size={18} className="inline mr-2" />
                  This report is published and visible in Claim page
                </div>
              )}
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
