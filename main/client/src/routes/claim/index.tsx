import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Search, MapPin, Calendar, Tag, RefreshCw } from 'lucide-react'

interface LostItem {
  id: string
  name: string
  description: string
  location: string
  date: string
  category: string
  status: 'lost' | 'found'
  image: string
}

export const Route = createFileRoute('/claim/')({
  component: ClaimantPage,
})

function ClaimantPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LostItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [type, setType] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with API call
    setItems([
      { id: '1', name: 'iPhone 13', description: 'Black iPhone with case', location: 'Library', date: '2026-03-15', category: 'Electronics', status: 'lost', image: 'https://via.placeholder.com/300' },
      { id: '2', name: 'Wallet', description: 'Brown leather wallet', location: 'Cafeteria', date: '2026-03-14', category: 'Accessories', status: 'found', image: 'https://via.placeholder.com/300' },
    ])
    setLoading(false)
  }, [])

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'All' || item.category === category
    const matchesType = type === 'All' || item.status === type.toLowerCase()
    return matchesSearch && matchesCategory && matchesType
  })

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Browse <span className="text-gradient">Items</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Find and claim your lost items</p>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              <option>All Categories</option>
              <option>Electronics</option>
              <option>Accessories</option>
              <option>Bags</option>
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
              <option>All Types</option>
              <option>Lost</option>
              <option>Found</option>
            </select>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item.id} className="card">
                <div className="relative mb-4">
                  <img src={item.image} alt={item.name} className="w-full h-48 object-cover rounded-xl" />
                  <span className={`absolute top-2 right-2 ${item.status === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-[#0217f7] dark:text-[#f5e102]" /> {item.location}</div>
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-[#0217f7] dark:text-[#f5e102]" /> {item.date}</div>
                  <div className="flex items-center gap-2"><Tag size={14} className="text-[#0217f7] dark:text-[#f5e102]" /> {item.category}</div>
                </div>
                <button
                  onClick={() => navigate({ to: '/claim/claimForm', search: { id: item.id, name: item.name, location: item.location, date: item.date, category: item.category } })}
                  className="w-full btn-primary"
                >
                  Claim Item
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}