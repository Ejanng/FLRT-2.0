import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Search, MapPin, Calendar, Tag, RefreshCw, Loader2 } from 'lucide-react'

interface LostItem {
  report_id: string
  item_name: string
  description: string
  location: string
  date_reported: string
  category: string
  status: string
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
  const [error, setError] = useState('')

  const fetchPublishedReports = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('http://localhost:5000/reports/claimable-reports')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      // Normalize status to 'lost' or 'found' for display
      const normalized = (data.reports || []).map((item: any) => ({
        ...item,
        status: item.status?.includes('lost') ? 'lost' : 'found'
      }))
      setItems(normalized)
    } catch (err) {
      setError('Failed to load items. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPublishedReports()
    
    // Refresh when localStorage changes (when admin publishes)
    const handleStorage = () => fetchPublishedReports()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const filtered = items.filter(item => {
    const matchesSearch = item.item_name?.toLowerCase().includes(search.toLowerCase()) || 
                         item.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'All' || item.category === category
    const matchesType = type === 'All' || item.status === type.toLowerCase()
    return matchesSearch && matchesCategory && matchesType
  })

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://via.placeholder.com/300x200?text=No+Image'
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/reports/images/${encodeURIComponent(imagePath)}`
  }

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
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search items..."
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
              <option>Books</option>
              <option>Stationery</option>
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
              <option>All Types</option>
              <option>Lost</option>
              <option>Found</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600 dark:text-gray-400">{filtered.length} items found</span>
          <button
            onClick={fetchPublishedReports}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-[#0217f7] dark:text-[#f5e102] border border-[#0217f7] dark:border-[#f5e102] rounded-lg hover:bg-[#0217f7] hover:text-white dark:hover:bg-[#f5e102] dark:hover:text-[#0217f7] transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={48} className="animate-spin text-[#0217f7] dark:text-[#f5e102]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No items found. Check back later!
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item.report_id} className="card">
                <div className="relative mb-4 overflow-hidden rounded-xl">
                  <img 
                    src={getImageUrl(item.image)} 
                    alt={item.item_name} 
                    className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image'
                    }}
                  />
                  <span className={`absolute top-2 right-2 ${item.status === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{item.item_name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[#0217f7] dark:text-[#f5e102]" /> 
                    {item.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#0217f7] dark:text-[#f5e102]" /> 
                    {new Date(item.date_reported).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-[#0217f7] dark:text-[#f5e102]" /> 
                    {item.category || 'Uncategorized'}
                  </div>
                </div>
                <button
                  onClick={() => navigate({ 
                    to: '/claim/claimForm', 
                    search: { 
                      id: item.report_id, 
                      name: item.item_name, 
                      location: item.location, 
                      date: item.date_reported, 
                      category: item.category 
                    } 
                  })}
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