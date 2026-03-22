import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Menu, X, Home, FileText, Search, Shield, Sun, Moon, Info } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { hasValidAdminSession } from '../utils/adminAuth'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // Simple path detection without useRouter
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
  
  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/'
    return currentPath.startsWith(path)
  }

  const isAuthenticatedAdmin = hasValidAdminSession()

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/report', label: 'Report', icon: FileText },
    { to: '/claim', label: 'Find', icon: Search },
    { to: '/about', label: 'About', icon: Info },
    { to: isAuthenticatedAdmin ? '/admin/dashboard' : '/admin', label: 'Admin', icon: Shield },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 glass-card border-b border-[#0217f7]/10 dark:border-[#f5e102]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0217f7] to-[#010bb3] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
              <div className="absolute w-3 h-3 bg-[#f5e102] rounded-full animate-pulse ml-6 -mt-6" />
            </div>
            <span className="text-2xl font-bold hidden sm:block">
              <span className="text-[#0217f7] dark:text-white">FL</span>
              <span className="text-[#f5e102]">R</span>
              <span className="text-[#0217f7] dark:text-white">T</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-gradient-to-r from-[#0217f7] to-[#010bb3] text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-[#0217f7]/10'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-[#f5e102]' : ''} />
                  {item.label}
                </Link>
              )
            })}
            
            <button
              onClick={toggleTheme}
              className="ml-4 p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-[#f5e102] hover:bg-[#0217f7] hover:text-white transition-all"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 rounded-lg bg-gradient-to-r from-[#0217f7] to-[#010bb3] text-white"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-[#12121a] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
              <span className="text-xl font-bold text-[#0217f7] dark:text-[#f5e102]">Menu</span>
              <button onClick={() => setIsOpen(false)}>
                <X size={24} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      active
                        ? 'bg-gradient-to-r from-[#0217f7] to-[#010bb3] text-white'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}