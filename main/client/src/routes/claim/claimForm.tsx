import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Upload, X, User, IdCard, Mail, FileText, ArrowLeft } from 'lucide-react'

type SearchParams = {
  id: string
  name: string
  location: string
  date: string
  category: string
}

export const Route = createFileRoute('/claim/claimForm')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    id: String(search.id || ''),
    name: String(search.name || ''),
    location: String(search.location || ''),
    date: String(search.date || ''),
    category: String(search.category || ''),
  }),
  component: ClaimFormPage,
})

function ClaimFormPage() {
  const { id, name, location, date, category } = Route.useSearch()
  const navigate = useNavigate()
  const [photoPreview, setPhotoPreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      navigate({ to: '/' })
    }, 1000)
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate({ to: '/claim' })} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#0217f7] mb-6">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="bg-[#f5e102]/10 border-2 border-[#f5e102] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-[#0217f7] dark:text-[#f5e102] mb-2">Claiming: {name}</h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div><span className="text-gray-500">Location:</span> {location}</div>
            <div><span className="text-gray-500">Date:</span> {date}</div>
            <div><span className="text-gray-500">Category:</span> {category}</div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Submit Claim</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <User size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Your Name <span className="text-red-500">*</span>
              </label>
              <input type="text" required placeholder="Full name" className="input-field" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <IdCard size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Student Number <span className="text-red-500">*</span>
              </label>
              <input type="text" required placeholder="2024-12345" className="input-field" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Mail size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" required placeholder="your@email.com" className="input-field" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <FileText size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Proof of Ownership <span className="text-red-500">*</span>
              </label>
              <textarea required rows={4} placeholder="Describe details only the owner would know..." className="input-field resize-none" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Upload size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Upload Proof <span className="text-red-500">*</span>
              </label>
              <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-[#0217f7] dark:hover:border-[#f5e102] transition-all cursor-pointer">
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img src={photoPreview} alt="Proof" className="max-h-48 rounded-xl" />
                    <button type="button" onClick={() => setPhotoPreview('')} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#0217f7] to-[#010bb3] flex items-center justify-center">
                      <Upload size={24} className="text-[#f5e102]" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload proof image</p>
                    <p className="text-xs text-gray-400">JPG, PNG (Max 5MB)</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3">
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
              <button type="button" onClick={() => navigate({ to: '/claim' })} className="flex-1 btn-secondary py-3">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}