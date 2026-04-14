import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, Loader2, X } from 'lucide-react'
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
  public_match_link?: string | null
  category?: string
}

export const Route = createFileRoute('/admin/dashboard/returned')({
  beforeLoad: () => {
    requireAdminAuth()
  },
  component: ReturnedReportsPage,
})

function ReturnedReportsPage() {
  const navigate = useNavigate()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [returnType, setReturnType] = useState<'all' | 'lost' | 'found'>('all')

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['all-reports'],
    queryFn: reportsApi.getAll,
  })

  const returnedReports: Report[] = (reportsData?.reports || []).filter((report: Report) => {
    const status = (report.status || '').toLowerCase()
    return status === 'returned' || status === 'returned_lost' || status === 'returned_found'
  })

  const typeFilteredReports = returnedReports.filter((report: Report) => {
    if (returnType === 'all') return true
    const status = (report.status || '').toLowerCase()
    if (returnType === 'lost') return status === 'returned_lost' || (status === 'returned' && report.item_name) // Fallback for old 'returned' status
    if (returnType === 'found') return status === 'returned_found' || (status === 'returned' && report.item_name)
    return true
  })

  const filteredReports: Report[] = typeFilteredReports.filter((report: Report) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(report.report_id).toLowerCase().includes(q) ||
      (report.item_name || '').toLowerCase().includes(q) ||
      (report.location || '').toLowerCase().includes(q) ||
      new Date(report.date_reported).toLocaleDateString().toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = (currentPageSafe - 1) * ITEMS_PER_PAGE
  const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleView = (report: Report) => {
    setSelectedReport(report)
    setIsModalOpen(true)
  }

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

  const getReportDisplayImage = (report: Report) => report.public_match_link || report.image || ''

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex gap-2 p-4 border-b border-gray-200 bg-gray-50/50 overflow-x-auto">
            <button
              onClick={() => navigate({ to: '/admin/dashboard' })}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-medium whitespace-nowrap"
            >
              All Reports
            </button>
            <button
              onClick={() => navigate({ to: '/admin/dashboard/verify' })}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-medium whitespace-nowrap"
            >
              Verify Claims
            </button>
            <button
              onClick={() => navigate({ to: '/admin/dashboard/reports' })}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-medium whitespace-nowrap"
            >
              Manage Reports
            </button>
            <button
              onClick={() => navigate({ to: '/admin/dashboard/found-items' })}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-medium whitespace-nowrap"
            >
              Found Items
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-gray-900 text-sm font-medium whitespace-nowrap">
              Returned Reports
            </button>
          </div>

          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Returned Reports</h1>
                <p className="text-gray-500 mt-1">Read-only history of reports already returned</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setReturnType('all'); setCurrentPage(1) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    returnType === 'all'
                      ? 'bg-[#0217f7] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Returns
                </button>
                <button
                  onClick={() => { setReturnType('lost'); setCurrentPage(1) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    returnType === 'lost'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Lost Returns
                </button>
                <button
                  onClick={() => { setReturnType('found'); setCurrentPage(1) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    returnType === 'found'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Found Returns
                </button>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                placeholder="Search by ID, name, location, or date..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0217f7]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="animate-spin mx-auto text-[#0217f7]" size={24} />
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No {search ? 'matching' : 'returned'} reports found</td>
                  </tr>
                ) : (
                  paginatedReports.map((report: Report) => (
                    <tr key={report.report_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        #{report.report_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {report.item_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {report.location}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(report.date_reported).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Returned
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleView(report)}
                          className="flex items-center gap-1 text-[#0217f7] hover:underline text-sm font-medium"
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredReports.length)} of {filteredReports.length} {search ? 'matching' : 'returned'} reports
              </p>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPageSafe === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPageSafe === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Report #{selectedReport.report_id}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {getReportDisplayImage(selectedReport) && (
                <div className="rounded-xl overflow-hidden">
                  <img
                    src={getImageUrl(getReportDisplayImage(selectedReport))}
                    alt={selectedReport.item_name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image'
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Item</p>
                  <p className="font-semibold text-gray-900">
                    {selectedReport.item_name}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <p className="font-semibold text-green-700">
                    Returned
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Location</p>
                  <p className="font-semibold text-gray-900">
                    {selectedReport.location}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedReport.date_reported).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
                <p className="text-gray-700 text-sm">{selectedReport.description}</p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50"
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
