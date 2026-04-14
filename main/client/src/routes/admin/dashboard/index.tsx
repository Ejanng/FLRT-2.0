// client/src/routes/admin/dashboard/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Box, Clock, CheckCircle, TrendingUp, LogOut, Loader2, RefreshCw } from 'lucide-react'
import { statsApi, authApi, siftApi } from '../../../services/api'
import { requireAdminAuth } from '../../../utils/adminAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface DashboardStats {
  total_reports: number
  pending_claims: number
  resolved: number
  active_users: number
  lost_reports: number
  found_reports: number
  published_reports: number
  recent_reports: number
  recent_claims: number
}

interface Report {
  report_id: string
  item_name: string
  location: string
  date_reported: string
  status: string
  image?: string | null
  public_match_link?: string | null
}

interface WebhookTestStatus {
  configured: boolean
  valid_format: boolean
  webhook_ref?: string | null
  success: boolean
  error: string | null
}

interface WebhookTestResponse {
  message: string
  results: {
    admin: WebhookTestStatus
    users: WebhookTestStatus
  }
}

interface DriveFolderStatus {
  status: 'ready' | 'failed' | 'skipped'
  folder_id: string | null
  configured_url?: string
}

interface DriveHealthResponse {
  success: boolean
  checked_at: string
  auth: {
    ok: boolean
    error: string | null
  }
  folders: Record<string, DriveFolderStatus>
  summary: {
    total: number
    ready: number
    failed: number
    skipped: number
  }
}

export const Route = createFileRoute('/admin/dashboard/')({
  beforeLoad: () => {
    requireAdminAuth()
  },
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [webhookTestResult, setWebhookTestResult] = useState<WebhookTestResponse | null>(null)
  const [webhookTestMessage, setWebhookTestMessage] = useState('')
  const [driveHealthResult, setDriveHealthResult] = useState<DriveHealthResponse | null>(null)
  const [driveHealthMessage, setDriveHealthMessage] = useState('')
  const [search, setSearch] = useState('')
  const driveHealthPanelRef = useRef<HTMLDivElement | null>(null)
  const driveHealthFailedCount = driveHealthResult?.summary?.failed || 0
  const hasDriveHealthIssues = driveHealthFailedCount > 0 || (!!driveHealthResult && !driveHealthResult.auth.ok)

  const focusDriveHealthPanel = () => {
    if (!driveHealthResult) {
      driveHealthMutation.mutate()
      return
    }
    driveHealthPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Fetch dashboard stats with auto-refresh every 30 seconds
  const { 
    data: statsData, 
    isLoading: statsLoading,
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: statsApi.getDashboard,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })

  // Fetch recent reports
  const { 
    data: reportsDataRaw, 
    isLoading: reportsLoading,
    refetch: refetchReports 
  } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/reports/all-reports`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      return data.reports?.slice(0, 5) || []
    },
    refetchInterval: 30000,
  })

  const reportsData = (reportsDataRaw || []).filter((report: Report) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(report.report_id).toLowerCase().includes(q) ||
      (report.item_name || '').toLowerCase().includes(q) ||
      (report.location || '').toLowerCase().includes(q) ||
      new Date(report.date_reported).toLocaleDateString().toLowerCase().includes(q)
    )
  })

  const getReportDisplayImage = (report: Report) => report.public_match_link || report.image || ''

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://via.placeholder.com/96x72?text=No+Image'

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

  const stats: DashboardStats = statsData?.stats || {
    total_reports: 0,
    pending_claims: 0,
    resolved: 0,
    active_users: 0,
    lost_reports: 0,
    found_reports: 0,
    published_reports: 0,
    recent_reports: 0,
    recent_claims: 0,
  }

  const statCards = [
    { 
      icon: Box, 
      label: 'Total Reports', 
      value: stats.total_reports, 
      color: 'blue',
      subtext: `${stats.recent_reports} new this week`
    },
    { 
      icon: Clock, 
      label: 'Pending Claims', 
      value: stats.pending_claims, 
      color: 'yellow',
      subtext: 'Awaiting review'
    },
    { 
      icon: CheckCircle, 
      label: 'Resolved', 
      value: stats.resolved, 
      color: 'green',
      subtext: 'Items returned'
    },
    { 
      icon: TrendingUp, 
      label: 'Active Users', 
      value: stats.active_users, 
      color: 'purple',
      subtext: 'Unique claimants'
    },
  ]

  const handleLogout = async () => {
    try {
      await authApi.logout()
      localStorage.removeItem('admin_token')
      queryClient.clear()
      navigate({ to: '/admin' })
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.removeItem('admin_token')
      navigate({ to: '/admin' })
    }
  }

  const handleManualRefresh = () => {
    refetchStats()
    refetchReports()
  }

  const webhookTestMutation = useMutation({
    mutationFn: () => siftApi.testWebhooks() as Promise<WebhookTestResponse>,
    onSuccess: (data) => {
      setWebhookTestResult(data)
      setWebhookTestMessage('Webhook test completed.')
      setTimeout(() => setWebhookTestMessage(''), 3000)
    },
    onError: (error: any) => {
      setWebhookTestMessage(error?.message || 'Webhook test failed')
      setTimeout(() => setWebhookTestMessage(''), 4000)
    },
  })

  const driveHealthMutation = useMutation({
    mutationFn: () => siftApi.driveHealth() as Promise<DriveHealthResponse>,
    onSuccess: (data) => {
      setDriveHealthResult(data)
      setDriveHealthMessage(data.success ? 'Drive health check passed.' : 'Drive health check found issues.')
      setTimeout(() => {
        driveHealthPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
      setTimeout(() => setDriveHealthMessage(''), 4000)
    },
    onError: (error: any) => {
      setDriveHealthMessage(error?.message || 'Drive health check failed')
      setTimeout(() => setDriveHealthMessage(''), 4000)
    },
  })

  // Listen for storage events to refresh data
  useEffect(() => {
    const handleStorage = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] })
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [queryClient])

  // Auto-clear webhook test result after 15 seconds
  useEffect(() => {
    if (!webhookTestResult) return
    const timer = setTimeout(() => setWebhookTestResult(null), 15000)
    return () => clearTimeout(timer)
  }, [webhookTestResult])

  // Auto-clear drive health result after 15 seconds
  useEffect(() => {
    if (!driveHealthResult) return
    const timer = setTimeout(() => setDriveHealthResult(null), 15000)
    return () => clearTimeout(timer)
  }, [driveHealthResult])

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Logout and Actions */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              {hasDriveHealthIssues && (
                <button
                  onClick={focusDriveHealthPanel}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors"
                  title="Jump to Drive Health details"
                >
                  Drive Issue: {driveHealthFailedCount || 1}
                </button>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
            <button
              onClick={handleManualRefresh}
              disabled={statsLoading || reportsLoading}
              className="flex items-center gap-2 px-4 py-2 text-[#0217f7] border border-[#0217f7] rounded-xl hover:bg-[#0217f7] hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={(statsLoading || reportsLoading) ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => webhookTestMutation.mutate()}
              disabled={webhookTestMutation.isPending}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Send test Discord webhook notifications"
            >
              {webhookTestMutation.isPending ? 'Testing...' : 'Test Webhooks'}
            </button>
            <button
              onClick={() => driveHealthMutation.mutate()}
              disabled={driveHealthMutation.isPending}
              className={`px-2.5 py-1 text-xs rounded-lg border hover:bg-gray-100 disabled:opacity-50 ${
                hasDriveHealthIssues
                  ? 'border-red-300 text-red-700 bg-red-50'
                  : 'border-gray-300 text-gray-700'
              }`}
              title="Check Google Drive auth and folder access"
            >
              {driveHealthMutation.isPending ? 'Checking...' : 'Test Drive Health'}
              {hasDriveHealthIssues && !driveHealthMutation.isPending ? ` (${driveHealthFailedCount || 1})` : ''}
            </button>
          </div>
        </div>
        {webhookTestMessage && (
          <p className="text-xs text-[#0217f7] -mt-2">{webhookTestMessage}</p>
        )}
        {driveHealthMessage && (
          <p className="text-xs text-[#0217f7] -mt-2">{driveHealthMessage}</p>
        )}
        {webhookTestResult?.results && (
          <div className="glass-card rounded-xl p-4 text-xs text-gray-700 space-y-2">
            <p className="font-semibold text-gray-900">Webhook Test Result</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium mb-1">FLIRT Announcement Webhook (Admin)</p>
                {webhookTestResult.results.admin.webhook_ref && (
                  <p>Ref: {webhookTestResult.results.admin.webhook_ref}</p>
                )}
                <p>
                  Configured:{' '}
                  <span className={webhookTestResult.results.admin.configured ? 'text-green-600' : 'text-red-500'}>
                    {String(webhookTestResult.results.admin.configured)}
                  </span>
                </p>
                <p>
                  Valid URL:{' '}
                  <span className={webhookTestResult.results.admin.valid_format ? 'text-green-600' : 'text-red-500'}>
                    {String(webhookTestResult.results.admin.valid_format)}
                  </span>
                </p>
                <p>
                  Success:{' '}
                  <span className={webhookTestResult.results.admin.success ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                    {String(webhookTestResult.results.admin.success)}
                  </span>
                </p>
                {webhookTestResult.results.admin.error && <p>Error: {webhookTestResult.results.admin.error}</p>}
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium mb-1">Secondary/User Webhook (Optional)</p>
                {webhookTestResult.results.users.webhook_ref && (
                  <p>Ref: {webhookTestResult.results.users.webhook_ref}</p>
                )}
                <p>
                  Configured:{' '}
                  <span className={webhookTestResult.results.users.configured ? 'text-green-600' : 'text-red-500'}>
                    {String(webhookTestResult.results.users.configured)}
                  </span>
                </p>
                <p>
                  Valid URL:{' '}
                  <span className={webhookTestResult.results.users.valid_format ? 'text-green-600' : 'text-red-500'}>
                    {String(webhookTestResult.results.users.valid_format)}
                  </span>
                </p>
                <p>
                  Success:{' '}
                  <span className={webhookTestResult.results.users.success ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                    {String(webhookTestResult.results.users.success)}
                  </span>
                </p>
                {webhookTestResult.results.users.error && <p>Error: {webhookTestResult.results.users.error}</p>}
              </div>
            </div>
          </div>
        )}
        {driveHealthResult && (
          <div ref={driveHealthPanelRef} className="glass-card rounded-xl p-4 text-xs text-gray-700 space-y-2">
            <p className="font-semibold text-gray-900">Drive Health Result</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium mb-1">Authentication</p>
                <p>
                  Status:{' '}
                  <span className={driveHealthResult.auth.ok ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                    {driveHealthResult.auth.ok ? 'OK' : 'FAILED'}
                  </span>
                </p>
                {driveHealthResult.auth.error && <p>Error: {driveHealthResult.auth.error}</p>}
                <p>Checked at: {new Date(driveHealthResult.checked_at).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium mb-1">Summary</p>
                <p>Total: {driveHealthResult.summary.total}</p>
                <p className="text-green-600">Ready: {driveHealthResult.summary.ready}</p>
                <p className="text-red-500">Failed: {driveHealthResult.summary.failed}</p>
                <p>Skipped: {driveHealthResult.summary.skipped}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <p className="font-medium mb-2">Folder Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(driveHealthResult.folders || {}).map(([name, info]) => (
                  <div key={name} className="rounded border border-gray-100 p-2">
                    <p className="font-medium">{name}</p>
                    <p>
                      Status:{' '}
                      <span className={
                        info.status === 'ready'
                          ? 'text-green-600 font-semibold'
                          : info.status === 'failed'
                            ? 'text-red-500 font-semibold'
                            : 'text-gray-500 font-semibold'
                      }>
                        {info.status}
                      </span>
                    </p>
                    {info.folder_id && <p>ID: {info.folder_id}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-5 hover:shadow-lg transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                stat.color === 'yellow' ? 'bg-[#f5e102]/20 text-[#0217f7]' : 'bg-[#0217f7]/10 text-[#0217f7]'
              }`}>
                <stat.icon size={20} />
              </div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {statsLoading ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">{stat.subtext}</p>
            </div>
          ))}
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Lost Items</p>
            <p className="text-xl font-bold text-red-600">{stats.lost_reports}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Found Items</p>
            <p className="text-xl font-bold text-green-600">{stats.found_reports}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Published Reports</p>
            <p className="text-xl font-bold text-[#0217f7]">{stats.published_reports}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-2 p-4 border-b border-gray-200 overflow-x-auto">
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-white text-sm font-medium whitespace-nowrap">
              All Reports
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/verify' })}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-medium whitespace-nowrap"
            >
              Verify Claims {stats.pending_claims > 0 && (
                <span className="ml-2 bg-red-500 text-gray-900 text-xs px-2 py-0.5 rounded-full">
                  {stats.pending_claims}
                </span>
              )}
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
            <button
              onClick={() => navigate({ to: '/admin/dashboard/returned' })}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-medium whitespace-nowrap"
            >
              Returned Reports
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, name, location, or date..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0217f7]"
            />
          </div>

          {/* Recent Reports Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <Loader2 className="animate-spin mx-auto text-[#0217f7]" size={24} />
                    </td>
                  </tr>
                ) : reportsData?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No reports found</td>
                  </tr>
                ) : (
                  reportsData?.map((report: Report) => (
                    <tr key={report.report_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {getReportDisplayImage(report) ? (
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                            <img
                              src={getImageUrl(getReportDisplayImage(report))}
                              alt={report.item_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/96x72?text=No+Image'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                            No Image
                          </div>
                        )}
                      </td>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status?.startsWith('published') ? 'bg-[#f5e102] text-gray-900' : 
                          report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}