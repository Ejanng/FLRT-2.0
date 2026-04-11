// client/src/routes/claim/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, MapPin, Calendar, Tag, RefreshCw, Loader2 } from 'lucide-react'
import { reportsApi } from '../../services/api'

const ITEMS_PER_PAGE = 9

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
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [type, setType] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)

  const { data: itemsData, isLoading, error } = useQuery({
    queryKey: ['claimable-reports'],
    queryFn: reportsApi.getClaimable,
    refetchInterval: 30000,
  })

  const items = itemsData?.reports || []

  const filtered = items.filter((item: LostItem) => {
    const matchesSearch = item.item_name?.toLowerCase().includes(search.toLowerCase()) || 
                         item.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'All' || item.category === category
    const matchesType = type === 'All' || item.status === type.toLowerCase()
    return matchesSearch && matchesCategory && matchesType
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = (currentPageSafe - 1) * ITEMS_PER_PAGE
  const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getDummyImageUrl = (seed: string) => {
    return `https://picsum.photos/seed/flrt-${encodeURIComponent(seed)}/300/200`
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Browse <span className="text-gradient">Items</span>
          </h1>
          <p className="text-gray-700">Find and claim your lost items</p>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="input-field pl-10"
              />
            </div>
            <select 
              value={category} 
              onChange={(e) => {
                setCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field"
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Accessories">Accessories</option>
              <option value="Bags">Bags</option>
              <option value="Books">Books</option>
              <option value="Stationery">Stationery</option>
            </select>
            <select 
              value={type} 
              onChange={(e) => {
                setType(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field"
            >
              <option value="All">All Types</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-700">{filtered.length} items found</span>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['claimable-reports'] })}
            disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-[#0217f7] border border-[#0217f7] rounded-lg hover:bg-[#0217f7] hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl text-center">
            Failed to load items. Please try again.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={48} className="animate-spin text-[#0217f7]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No items found. Check back later!
          </div>
        ) : (
          <div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedItems.map((item: LostItem) => (
                <div key={item.report_id} className="card">
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    <img 
                      src={getDummyImageUrl(item.report_id)}
                      alt={item.item_name} 
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getDummyImageUrl(`${item.report_id}-fallback`)
                      }}
                    />
                    <span className={`absolute top-2 right-2 ${item.status === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                      {item.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{item.item_name}</h3>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.description}</p>
                  <div className="space-y-1 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#0217f7]" /> 
                      {item.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-[#0217f7]" /> 
                      {new Date(item.date_reported).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-[#0217f7]" /> 
                      {item.category || 'Uncategorized'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (item.status === 'lost') {
                        navigate({
                          to: '/claim/claimForm',
                          search: {
                            id: item.report_id,
                            name: item.item_name,
                            location: item.location,
                            date: item.date_reported,
                            category: item.category,
                            mode: 'found',
                          },
                        })
                        return
                      }

                      navigate({
                        to: '/claim/claimForm',
                        search: {
                          id: item.report_id,
                          name: item.item_name,
                          location: item.location,
                          date: item.date_reported,
                          category: item.category,
                        },
                      })
                    }}
                    className="w-full btn-primary"
                  >
                    {item.status === 'lost' ? 'I Found This Item' : 'Claim Item'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPageSafe === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPageSafe === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
