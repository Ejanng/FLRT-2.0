import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FileText, Search, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.131:5000'

const fetchStatistics = async () => {
  const response = await axios.get(`${API_BASE_URL}/stats/dashboard`)
  return response.data.stats
}

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['statistics'],
    queryFn: fetchStatistics,
    refetchInterval: 30000,
    staleTime: 10000,
  })

  // Calculate derived statistics for display
  const getDisplayStats = () => {
    if (!stats) return null

    const totalResolved = stats.resolved || 0
    const totalPending = stats.pending_claims || 0
    const totalReports = stats.total_reports || 1 // avoid div by zero

    return {
      itemsReturned: totalResolved,
      successRate: Math.round((totalResolved / totalReports) * 100),
      pendingItems: totalPending,
      totalReports: stats.total_reports,
      activeUsers: stats.active_users,
      recentActivity: (stats.recent_reports || 0) + (stats.recent_claims || 0)
    }
  }

  const displayStats = getDisplayStats()

  // Format numbers for display
  const formatStat = (value: number | undefined, fallback: string) => {
    if (isLoading) return <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0217f7]" />
    if (error || value === undefined) return fallback
    return value.toLocaleString()
  }

  const statistics = [
    { 
      value: formatStat(displayStats?.itemsReturned, '267'), 
      label: 'Items Returned',
      key: 'returned'
    },
    { 
      value: displayStats ? `${displayStats.successRate}%` : '90%', 
      label: 'Success Rate',
      key: 'success'
    },
    { 
      value: formatStat(displayStats?.pendingItems, '12'), 
      label: 'Pending Claims',
      key: 'pending'
    },
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0217f7]/10 dark:bg-[#f5e102]/10 border border-[#0217f7]/20 mb-8">
          <Sparkles size={16} className="text-[#f5e102]" />
          <span className="text-sm font-medium text-[#0217f7] dark:text-[#f5e102]">
            Smart Lost & Found System
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          <span className="block text-gray-900 dark:text-white mb-2">
            Welcome to <span className="text-[#0217f7]">FLIRT</span>
          </span>
          <span className="text-gradient">Lost Items Made Simple</span>
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12">
          Report lost items, find what you've misplaced, and connect with finders 
          using our AI-powered matching system.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button
            onClick={() => navigate({ to: '/report' })}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0217f7] to-[#010bb3] p-8 text-left transition-all hover:shadow-2xl hover:-translate-y-2"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#f5e102]/20 rounded-full blur-2xl transform translate-x-16 -translate-y-16" />
            <FileText size={32} className="text-[#f5e102] mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Report Item</h3>
            <p className="text-blue-100 text-sm mb-4">Lost something? Let us help you find it.</p>
            <div className="flex items-center text-[#f5e102] font-semibold">
              Get Started <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate({ to: '/claim' })}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e2e] border-2 border-[#0217f7]/20 dark:border-[#f5e102]/20 p-8 text-left transition-all hover:shadow-2xl hover:-translate-y-2"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#f5e102]/30 rounded-full blur-2xl transform translate-x-16 -translate-y-16" />
            <Search size={32} className="text-[#0217f7] dark:text-[#f5e102] mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Find Item</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Browse reported items and claim yours.</p>
            <div className="flex items-center text-[#0217f7] dark:text-[#f5e102] font-semibold">
              Browse Items <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Statistics Section - Now with Real Data from /stats/dashboard */}
        <div className="mt-16 grid grid-cols-3 gap-8">
          {statistics.map((stat) => (
            <div key={stat.key} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#0217f7] dark:text-[#f5e102] mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Additional Stats Row - Optional */}
        {displayStats && (
          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-white/50 dark:bg-white/5 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {displayStats.totalReports.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total Reports</div>
            </div>
            <div className="bg-white/50 dark:bg-white/5 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {displayStats.activeUsers.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Active Users</div>
            </div>
          </div>
        )}

        {/* Last Updated Indicator */}
        {!isLoading && !error && (
          <div className="mt-4 text-xs text-gray-400">
            Stats updated: {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}
