import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FileText, Search, ArrowRight, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()

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
            Finding and Locating
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
              Get Started <ArrowRight size={18} className="ml-2" />
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
              Browse Items <ArrowRight size={18} className="ml-2" />
            </div>
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8">
          {[
            { value: '267', label: 'Items Found' },
            { value: '90%', label: 'Success Rate' },
            { value: '24h', label: 'Avg. Response' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#0217f7] dark:text-[#f5e102] mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}