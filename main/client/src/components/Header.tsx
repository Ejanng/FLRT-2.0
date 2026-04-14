import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { Menu, X, Home, FileText, Search, Info, Shield } from 'lucide-react'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  // Get current path from React Router location
  const currentPath = location.pathname
  
  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/'
    return currentPath.startsWith(path)
  }

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/report', label: 'Report', icon: FileText },
    { to: '/claim', label: 'Find', icon: Search },
    { to: '/about', label: 'About', icon: Info },
    { to: '/admin', label: 'Admin', icon: Shield },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 glass-card border-b border-[#0217f7]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0217f7] to-[#010bb3] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
              <div className="absolute w-3 h-3 bg-[#f5e102] rounded-full animate-pulse ml-6 -mt-6" />
            </div>
            <span className="text-2xl font-bold hidden sm:block">
              <span className="text-[#0217f7]">FL</span>
              <span className="text-[#f5e102]">R</span>
              <span className="text-[#0217f7]">T</span>
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
                    item.to === '/admin'
                      ? active
                        ? 'bg-gradient-to-r from-[#f5e102] to-[#f3d400] text-gray-900 shadow'
                        : 'border border-[#0217f7]/30 text-[#0217f7] hover:bg-[#0217f7]/10'
                      : active
                        ? 'bg-gradient-to-r from-[#0217f7] to-[#010bb3] text-white'
                        : 'text-gray-700 hover:bg-[#0217f7]/10'
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      item.to === '/admin'
                        ? active
                          ? 'text-gray-900'
                          : 'text-[#0217f7]'
                        : active
                          ? 'text-white/90'
                          : ''
                    }
                  />
                  {item.label}
                  {item.to === '/admin' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide ${
                        active ? 'bg-gray-900/10 text-gray-900' : 'bg-[#0217f7]/10 text-[#0217f7]'
                      }`}
                    >
                      LOCK
                    </span>
                  )}
                </Link>
              )
            })}
            
          </nav>

          <div className="flex items-center gap-2 md:hidden">
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
          <aside className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="text-xl font-bold text-[#0217f7]">Menu</span>
              <button onClick={() => setIsOpen(false)}>
                <X size={24} className="text-gray-600" />
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
                      item.to === '/admin'
                        ? active
                          ? 'bg-gradient-to-r from-[#f5e102] to-[#f3d400] text-gray-900 shadow'
                          : 'border border-[#0217f7]/30 text-[#0217f7]'
                        : active
                          ? 'bg-gradient-to-r from-[#0217f7] to-[#010bb3] text-white'
                          : 'text-gray-700'
                    }`}
                  >
                    <Icon
                      size={20}
                      className={
                        item.to === '/admin'
                          ? active
                            ? 'text-gray-900'
                            : 'text-[#0217f7]'
                          : active
                            ? 'text-white/90'
                            : ''
                      }
                    />
                    {item.label}
                    {item.to === '/admin' && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide ml-1 ${
                          active ? 'bg-gray-900/10 text-gray-900' : 'bg-[#0217f7]/10 text-[#0217f7]'
                        }`}
                      >
                        LOCK
                      </span>
                    )}
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