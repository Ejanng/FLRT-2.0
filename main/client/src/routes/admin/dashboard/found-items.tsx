// client/src/routes/admin/dashboard/found-items.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CheckCircle, Eye, Loader2, Phone, Mail, MessageSquare, CheckCheck, XCircle } from 'lucide-react'
import { foundItemsApi } from '../../../services/api'
import { requireAdminAuth } from '../../../utils/adminAuth'

const ITEMS_PER_PAGE = 8
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface FoundItem {
  found_item_id: number
  finder_name: string
  finder_student_number: string
  finder_contact_info: string
  item_name: string
  item_description: string
  item_location: string
  category?: string
  date_found: string
  date_submitted: string
  status: string
  image?: string
  admin_notes?: string
  date_contacted?: string
  date_closed?: string
}

export const Route = createFileRoute('/admin/dashboard/found-items')({
  beforeLoad: () => {
    requireAdminAuth()
  },
  component: FoundItemsPage,
})

function FoundItemsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<FoundItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [isContacting, setIsContacting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['pending-found-items'],
    queryFn: foundItemsApi.getPending,
    refetchInterval: 10000,
  })

  const items: FoundItem[] = itemsData?.found_items || []
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = (currentPageSafe - 1) * ITEMS_PER_PAGE
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const contactMutation = useMutation({
    mutationFn: ({ foundItemId, notes }: { foundItemId: number; notes: string }) =>
      foundItemsApi.contact(foundItemId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-found-items'] })
      setMessage('Finder contacted successfully!')
      setTimeout(() => {
        setIsContacting(false)
        setAdminNotes('')
      }, 1500)
    },
    onError: (error: any) => {
      setMessage(error.message || 'Failed to contact finder')
    },
  })

  const closeMutation = useMutation({
    mutationFn: ({ foundItemId, status }: { foundItemId: number; status: 'returned' | 'cancelled' }) =>
      foundItemsApi.close(foundItemId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-found-items'] })
      setMessage(`Found item marked as ${variables.status}!`)
      setTimeout(() => {
        setIsModalOpen(false)
        setSelectedItem(null)
        setMessage('')
      }, 1500)
    },
    onError: (error: any) => {
      setMessage(error.message || 'Failed to close found item')
    },
  })

  const handleView = (item: FoundItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
    setMessage('')
    setAdminNotes('')
    setIsContacting(false)
  }

  const handleContact = () => {
    if (!selectedItem) return
    if (!adminNotes.trim()) {
      setMessage('Please enter admin notes before contacting')
      return
    }
    contactMutation.mutate({ foundItemId: selectedItem.found_item_id, notes: adminNotes })
  }

  const handleClose = (status: 'returned' | 'cancelled') => {
    if (!selectedItem) return
    if (!confirm(`Mark this item as ${status}?`)) return
    closeMutation.mutate({ foundItemId: selectedItem.found_item_id, status })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      returned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const isContactInfo = (info: string) => {
    return info.includes('@') ? 'email' : 'phone'
  }

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://via.placeholder.com/400x300?text=No+Image'

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
    return `${API_BASE_URL}/found-items/images/${encodeURIComponent(imagePath)}`
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto">
            <button 
              onClick={() => navigate({ to: '/admin/dashboard' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              All Reports
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/verify' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Verify Claims
            </button>
            <button 
              onClick={() => navigate({ to: '/admin/dashboard/reports' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Manage Reports
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#0217f7] text-white text-sm font-medium whitespace-nowrap">
              Found Items
            </button>
            <button
              onClick={() => navigate({ to: '/admin/dashboard/returned' })}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium whitespace-nowrap"
            >
              Returned Reports
            </button>
          </div>

          {/* Header Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Found Items</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Manage items found by community members seeking to return them
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="bg-[#f5e102] text-[#0217f7] px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                  {items.filter((i: FoundItem) => i.status === 'pending').length} Pending
                </span>
              </div>
            </div>
          </div>

          {/* Items List or Empty State */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={48} className="animate-spin text-[#0217f7] dark:text-[#f5e102]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No found items</p>
              <p className="text-sm">All submitted found items have been processed!</p>
            </div>
          ) : (
            <div className="grid gap-4 p-6">
              {paginatedItems.map((item: FoundItem) => (
                <div 
                  key={item.found_item_id} 
                  className="bg-white dark:bg-[#1e1e2e] rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Item Image */}
                    <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.image && (
                        <img 
                          src={getImageUrl(item.image)} 
                          alt={item.item_name}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/128x128?text=No+Image')}
                        />
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{item.item_name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ID: #{item.found_item_id}</p>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{item.item_description}</p>

                      {/* Finder Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Finder</p>
                          <p className="font-medium text-gray-900 dark:text-white">{item.finder_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.finder_student_number}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Location Found</p>
                          <p className="font-medium text-gray-900 dark:text-white">{item.item_location}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(item.date_found).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Finder Contact */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {isContactInfo(item.finder_contact_info) === 'email' ? (
                          <>
                            <Mail size={16} className="text-blue-500" />
                            <a 
                              href={`mailto:${item.finder_contact_info}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                            >
                              {item.finder_contact_info}
                            </a>
                          </>
                        ) : (
                          <>
                            <Phone size={16} className="text-green-500" />
                            <a 
                              href={`tel:${item.finder_contact_info}`}
                              className="text-green-600 dark:text-green-400 hover:underline text-sm"
                            >
                              {item.finder_contact_info}
                            </a>
                          </>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleView(item)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0217f7] hover:bg-[#0217f7]/90 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, items.length)} of {items.length} found items
              </p>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPageSafe === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentPageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPageSafe === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e2e]">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Found Item Details</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedItem(null)
                  setAdminNotes('')
                  setIsContacting(false)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status & Message */}
              {message && (
                <div className={`p-4 rounded-lg ${
                  message.includes('successfully') 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {message}
                </div>
              )}

              {/* Item Image */}
              {selectedItem.image && (
                <div className="rounded-lg overflow-hidden bg-gray-100">
                  <img 
                    src={getImageUrl(selectedItem.image)} 
                    alt={selectedItem.item_name}
                    className="w-full h-64 object-cover"
                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image')}
                  />
                </div>
              )}

              {/* Item Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Item Name</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedItem.item_name}</p>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Description</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedItem.item_description}</p>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Location Found</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedItem.item_location}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Date Found</h3>
                    <p className="text-gray-700 dark:text-gray-300">{new Date(selectedItem.date_found).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Category</h3>
                    <p className="text-gray-700 dark:text-gray-300">{selectedItem.category || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Finder Information */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Finder Information</h3>
                
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Name</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedItem.finder_name}</p>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Student Number</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedItem.finder_student_number}</p>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Contact Information</h4>
                  <div className="flex items-center gap-2">
                    {isContactInfo(selectedItem.finder_contact_info) === 'email' ? (
                      <>
                        <Mail size={18} className="text-blue-500" />
                        <a 
                          href={`mailto:${selectedItem.finder_contact_info}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {selectedItem.finder_contact_info}
                        </a>
                      </>
                    ) : (
                      <>
                        <Phone size={18} className="text-green-500" />
                        <a 
                          href={`tel:${selectedItem.finder_contact_info}`}
                          className="text-green-600 dark:text-green-400 hover:underline"
                        >
                          {selectedItem.finder_contact_info}
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
                    <span className="text-gray-700 dark:text-gray-300">{new Date(selectedItem.date_submitted).toLocaleDateString()}</span>
                  </div>
                  {selectedItem.date_contacted && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Contacted:</span>
                      <span className="text-gray-700 dark:text-gray-300">{new Date(selectedItem.date_contacted).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedItem.date_closed && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Closed:</span>
                      <span className="text-gray-700 dark:text-gray-300">{new Date(selectedItem.date_closed).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Section */}
              {selectedItem.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Admin Actions</h3>

                  {!isContacting ? (
                    <button
                      onClick={() => setIsContacting(true)}
                      disabled={contactMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <MessageSquare size={18} />
                      Mark as Contacted & Reach Out
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Enter admin notes (e.g., item description, next steps, etc.)"
                        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-[#1e1e2e] dark:text-white resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleContact}
                          disabled={contactMutation.isPending || !adminNotes.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCheck size={16} />
                          {contactMutation.isPending ? 'Saving...' : 'Confirm & Send'}
                        </button>
                        <button
                          onClick={() => {
                            setIsContacting(false)
                            setAdminNotes('')
                          }}
                          disabled={contactMutation.isPending}
                          className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Close Actions */}
              {(selectedItem.status === 'pending' || selectedItem.status === 'contacted') && (
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Close Item</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleClose('returned')}
                      disabled={closeMutation.isPending}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={18} />
                      Returned
                    </button>
                    <button
                      onClick={() => handleClose('cancelled')}
                      disabled={closeMutation.isPending}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <XCircle size={18} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {selectedItem.admin_notes && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2">Admin Notes</h3>
                  <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">{selectedItem.admin_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
