import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, IdCard, Mail, FileText, ArrowLeft, Loader2, CheckCircle, Upload, X } from 'lucide-react'
import { claimsApi } from '../services/api'

interface FoundFormProps {
  reportId: string
  itemName: string
  location: string
  date: string
  category: string
}

export default function FoundForm({ reportId, itemName, location, date, category }: FoundFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    finderName: '',
    finderStudentNumber: '',
    finderContact: '',
    details: '',
  })

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submitMutation = useMutation({
    mutationFn: (data: FormData) => claimsApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-claims'] })
      queryClient.invalidateQueries({ queryKey: ['claimable-reports'] })
      alert('Submission received. The admin will contact you and verify the match.')
      navigate({ to: '/claim' })
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to submit. Please try again.')
    },
  })

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!reportId) nextErrors.report = 'Invalid report reference. Please go back and select the item again.'
    if (!formData.finderName.trim()) nextErrors.finderName = 'Name is required'
    if (!formData.finderStudentNumber.trim()) nextErrors.finderStudentNumber = 'Student number is required'
    if (!formData.finderContact.trim()) {
      nextErrors.finderContact = 'Contact is required'
    } else if (!formData.finderContact.includes('@') && !formData.finderContact.startsWith('0')) {
      nextErrors.finderContact = 'Enter a valid email or phone number'
    }
    if (!formData.details.trim()) nextErrors.details = 'Please provide important details for admin verification'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const payload = new FormData()
    payload.append('report_id', reportId)
    payload.append('claimantName', formData.finderName)
    payload.append('claimantId', formData.finderStudentNumber)
    payload.append('claimantEmail', formData.finderContact)
    payload.append('description', formData.details)

    if (photoFile) {
      payload.append('proof_image', photoFile)
    }

    submitMutation.mutate(payload)
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate({ to: '/claim' })}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#0217f7] mb-6 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Items
        </button>

        <div className="bg-[#f5e102]/10 border-2 border-[#f5e102] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-[#0217f7] dark:text-[#f5e102] mb-2">Found Item: {itemName}</h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div><span className="text-gray-500">Location:</span> {location}</div>
            <div><span className="text-gray-500">Date:</span> {new Date(date).toLocaleDateString()}</div>
            <div><span className="text-gray-500">Category:</span> {category || 'Uncategorized'}</div>
            <div><span className="text-gray-500">Report ID:</span> #{reportId}</div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">I Found This Item</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Share your personal details so admins can contact you and coordinate the return with the owner.
          </p>

          {errors.report && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              {errors.report}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <User size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.finderName}
                onChange={(e) => setFormData((prev) => ({ ...prev, finderName: e.target.value }))}
                placeholder="Full name"
                className={`input-field ${errors.finderName ? 'border-red-500' : ''}`}
              />
              {errors.finderName && <p className="text-red-500 text-xs mt-1">{errors.finderName}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <IdCard size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Student Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.finderStudentNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, finderStudentNumber: e.target.value }))}
                placeholder="2024-12345"
                className={`input-field ${errors.finderStudentNumber ? 'border-red-500' : ''}`}
              />
              {errors.finderStudentNumber && <p className="text-red-500 text-xs mt-1">{errors.finderStudentNumber}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Mail size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Contact (Email or Phone) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.finderContact}
                onChange={(e) => setFormData((prev) => ({ ...prev, finderContact: e.target.value }))}
                placeholder="you@email.com or 09123456789"
                className={`input-field ${errors.finderContact ? 'border-red-500' : ''}`}
              />
              {errors.finderContact && <p className="text-red-500 text-xs mt-1">{errors.finderContact}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <FileText size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Item/Find Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData((prev) => ({ ...prev, details: e.target.value }))}
                rows={4}
                placeholder="Tell admins where and how you found this item, plus any useful identifying details."
                className={`input-field resize-none ${errors.details ? 'border-red-500' : ''}`}
              />
              {errors.details && <p className="text-red-500 text-xs mt-1">{errors.details}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Upload size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Upload Item Photo <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer border-gray-300 dark:border-gray-600 hover:border-[#0217f7] dark:hover:border-[#f5e102]">
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img src={photoPreview} alt="Item" className="max-h-48 rounded-xl" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview('')
                        setPhotoFile(null)
                      }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#0217f7] to-[#010bb3] flex items-center justify-center">
                      <Upload size={24} className="text-[#f5e102]" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload item photo</p>
                    <p className="text-xs text-gray-400">JPG, PNG (Max 5MB)</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <><Loader2 size={20} className="animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle size={20} /> Submit to Admin</>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: '/claim' })}
                className="flex-1 btn-secondary py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
