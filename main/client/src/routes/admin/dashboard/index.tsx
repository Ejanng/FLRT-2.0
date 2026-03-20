import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Box, Clock, CheckCircle, TrendingUp, Search } from 'lucide-react'

interface Report {
  id: string
  item: string
  location: string
  date: string
  status: 'claimed' | 'resolved'
}

export const Route = createFileRoute('/admin/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()
  const [reports] = useState<Report[]>([
    { id: 'R-1001', item: 'Wallet', location: 'Library', date: '2026-02-12', status: 'resolved' },
    { id: 'R-1002', item: 'Umbrella', location: 'Cafeteria', date: '2026-02-13', status: 'claimed' },
    { id: 'R-1003', item: 'Phone', location: 'Lab 204', date: '2026-02-14', status: 'resolved' },
  ])

  const stats = [
    { icon: Box, label: 'Total Reports', value: '267', color: 'blue' },
    { icon: Clock, label: 'Pending', value: '0', color: 'yellow' },
    { icon: CheckCircle, label: 'Resolved', value: '90', color: 'green' },
    { icon: TrendingUp, label: 'Users', value: '1', color: 'purple' },
  ]

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                stat.color === 'yellow' ? 'bg-[#f5e102]/20 text-[#0217f7]' : 'bg-[#0217f7]/10 text-[#0217f7]'
              }`}>
                <stat.icon size={20} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-800">
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-white text-sm font-medium">All Reports</button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/verify' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              Verify Claims
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/reports' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              Manage Reports
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search reports..." className="input-field pl-10" />
            </div>
          </div>

          {/* Table */}
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
                {reports.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.item}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.location}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.status === 'claimed' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}