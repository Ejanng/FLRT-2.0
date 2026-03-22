// client/src/routes/admin/dashboard/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Box, Clock, CheckCircle, TrendingUp, Search, LogOut, Loader2, RefreshCw } from 'lucide-react'
import { statsApi, authApi } from '../../../services/api'

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
}

export const Route = createFileRoute('/admin/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    data: reportsData, 
    isLoading: reportsLoading,
    refetch: refetchReports 
  } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: async () => {
      const res = await fetch('http://192.168.1.131:5000/reports/all-reports')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      return data.reports?.slice(0, 5) || []
    },
    refetchInterval: 30000,
  })

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

  // Listen for storage events to refresh data
  useEffect(() => {
    const handleStorage = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] })
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [queryClient])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Logout and Refresh */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={statsLoading || reportsLoading}
              className="flex items-center gap-2 px-4 py-2 text-[#0217f7] dark:text-[#f5e102] border border-[#0217f7] dark:border-[#f5e102] rounded-xl hover:bg-[#0217f7] hover:text-white dark:hover:bg-[#f5e102] dark:hover:text-[#0217f7] transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={(statsLoading || reportsLoading) ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-5 hover:shadow-lg transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                stat.color === 'yellow' ? 'bg-[#f5e102]/20 text-[#0217f7]' : 'bg-[#0217f7]/10 text-[#0217f7]'
              }`}>
                <stat.icon size={20} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
            </div>
          ))}
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Lost Items</p>
            <p className="text-xl font-bold text-red-600">{stats.lost_reports}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Found Items</p>
            <p className="text-xl font-bold text-green-600">{stats.found_reports}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
            <p className="text-xl font-bold text-[#0217f7] dark:text-[#f5e102]">{stats.published_reports}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-white text-sm font-medium whitespace-nowrap">
              All Reports
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/verify' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Verify Claims {stats.pending_claims > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.pending_claims}
                </span>
              )}
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
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search reports..." className="input-field pl-10" />
            </div>
          </div>

          {/* Recent Reports Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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
                    <tr key={report.report_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        #{report.report_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {report.item_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {report.location}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(report.date_reported).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status?.startsWith('published') ? 'bg-[#f5e102] text-[#0217f7]' : 
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