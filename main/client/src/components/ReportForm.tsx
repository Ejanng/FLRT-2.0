import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Upload, X, Loader2, Camera, MapPin, Calendar, FileText, Sparkles } from 'lucide-react'
import PersonalInfoModal from './PersonalInfoModal'
import MatchResultCard from './MatchResultCard'

interface ReportFormData {
  itemName: string
  description: string
  status: 'lost' | 'found' | ''
  location: string
  date: string
  time?: string
  photo: File | null
  studentName?: string
  studentNumber?: string
  contactInfo?: string
}

const MAX_CHARS = 1000

export default function ReportForm() {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState<ReportFormData>({
    itemName: '',
    description: '',
    status: '',
    location: '',
    date: '',
    time: '',
    photo: null,
  })
  
  const [pendingData, setPendingData] = useState<ReportFormData | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [submitMessage, setSubmitMessage] = useState<string>('')
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [matchResult, setMatchResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }))
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) {
      setFormData((prev) => ({ ...prev, photo: file }))
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSubmitMessage('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('item_name', formData.itemName)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('status', formData.status)
      formDataToSend.append('location', formData.location)
      formDataToSend.append('date', formData.date)
      formDataToSend.append('time', formData.time || '')
      
      if (formData.photo) {
        formDataToSend.append('image', formData.photo)
      }

      const response = await fetch('http://localhost:5000/reports/report-item', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      if (data.missing_fields === 'Missing') {
        setPendingData(formData)
        setShowModal(true)
        setIsLoading(false)
        return
      }

      setSubmitStatus('success')
      setSubmitMessage(data.message)
      
      if (data.new_pending_claim) {
        setMatchResult({
          name: data.new_pending_claim.image?.split('/').pop() || 'Matched Item',
          gdrive_view_link: data.new_pending_claim.image,
        })
      }

      // Reset form
      setFormData({
        itemName: '',
        description: '',
        status: '',
        location: '',
        date: '',
        time: '',
        photo: null,
      })
      setPhotoPreview('')
    } catch (error) {
      setSubmitStatus('error')
      setSubmitMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePersonalInfoSubmit = (info: { studentName: string; studentNumber: string; contactInfo: string }) => {
    if (!pendingData) return
    // Resubmit with personal info
    setShowModal(false)
    setIsLoading(true)
    
    // Simulate resubmission
    setTimeout(() => {
      setSubmitStatus('success')
      setSubmitMessage('Report submitted successfully with your contact info!')
      setIsLoading(false)
      setPendingData(null)
    }, 1000)
  }

  const charCount = formData.description.length
  const progress = Math.min((charCount / MAX_CHARS) * 100, 100)

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 lg:p-10">
      {submitMessage && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          submitStatus === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200'
        }`}>
          {submitStatus === 'success' ? <Sparkles size={20} /> : <X size={20} />}
          {submitMessage}
        </div>
      )}

      {matchResult && <MatchResultCard match={matchResult} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            <FileText size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            placeholder="e.g., Black Backpack, iPhone 13"
            required
            className="input-field"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            <FileText size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide detailed description..."
            rows={4}
            maxLength={MAX_CHARS}
            required
            className="input-field resize-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0217f7] to-[#f5e102] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{charCount}/{MAX_CHARS}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <Sparkles size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="input-field appearance-none bg-white dark:bg-[#1e1e2e]"
            >
              <option value="">Select status</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <MapPin size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Library 2nd Floor"
              required
              className="input-field"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <Calendar size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <Calendar size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
              Time <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            <Camera size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
            Photo <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-[#0217f7] dark:hover:border-[#f5e102] transition-all cursor-pointer group"
          >
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Preview" className="max-h-48 rounded-xl shadow-lg" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFormData((prev) => ({ ...prev, photo: null }))
                    setPhotoPreview('')
                  }}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#0217f7] to-[#010bb3] flex items-center justify-center">
                  <Upload size={28} className="text-[#f5e102]" />
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="text-[#0217f7] dark:text-[#f5e102] font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">JPEG, PNG (Max 5MB)</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button type="submit" disabled={isLoading} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3">
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="text-[#f5e102]" />}
            {isLoading ? 'Processing...' : 'Submit Report'}
          </button>
          <button type="button" onClick={() => navigate({ to: '/' })} className="flex-1 btn-secondary py-3">
            Cancel
          </button>
        </div>
      </form>

      <PersonalInfoModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setPendingData(null)
        }}
        onSubmit={handlePersonalInfoSubmit}
        isLoading={isLoading}
        matchFound={!!matchResult}
      />
    </div>
  )
}