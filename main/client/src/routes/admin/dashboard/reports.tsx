// client/src/routes/admin/dashboard/reports.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, CheckCircle, XCircle, Eye, Loader2, Check, Trash2 } from 'lucide-react'
import { reportsApi } from '../../../services/api'

interface Report {
  report_id: string
  item_name: string
  description: string
  location: string
  date_reported: string
  status: string
  image?: string
  category?: string
}

export const Route = createFileRoute('/admin/dashboard/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState('')

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['all-reports'],
    queryFn: reportsApi.getAll,
  })

  const reports = reportsData?.reports || []

  const publishMutation = useMutation({
    mutationFn: (reportId: number) => reportsApi.publish(reportId),
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

  const handleView = (report: Report) => {
    setSelectedReport(report)
    setIsModalOpen(true)
    setMessage('')
  }

  const handlePublish = () => {
    if (!selectedReport) return
    publishMutation.mutate(parseInt(selectedReport.report_id))
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
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/reports/images/${encodeURIComponent(imagePath)}`
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <button 
              onClick={() => navigate({ to: '/admin/dashboard' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              All Reports
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/verify' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              Verify Claims
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-white text-sm font-medium">
              Manage Reports
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search reports..." className="input-field pl-10" />
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
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No reports found</td>
                  </tr>
                ) : (
                  reports.map((report: Report) => (
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
                message.includes('success') 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {message.includes('success') ? <CheckCircle size={18} /> : <XCircle size={18} />}
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
              
              <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!isPublished(selectedReport.status) ? (
                <>
                  <button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
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