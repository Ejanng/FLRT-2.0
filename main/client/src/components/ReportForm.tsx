// client/src/components/ReportForm.tsx
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, Loader2, Camera, MapPin, Calendar, FileText, Sparkles } from 'lucide-react'
import PersonalInfoModal from './PersonalInfoModal'
import MatchResultCard from './MatchResultCard'
import { reportsApi } from '../services/api'
import { validateImageFile } from '../utils/fileValidation'

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
  existingReportId?: number
  matchedImageSource?: string
}

const MAX_CHARS = 1000

interface ReportFormProps {
  initialData?: Partial<ReportFormData>
}

export default function ReportForm({ initialData }: ReportFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const normalizedInitialData: ReportFormData = {
    itemName: initialData?.itemName || '',
    description: initialData?.description || '',
    status: initialData?.status || '',
    location: initialData?.location || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    photo: null,
    studentName: initialData?.studentName,
    studentNumber: initialData?.studentNumber,
    contactInfo: initialData?.contactInfo,
    existingReportId: initialData?.existingReportId,
    matchedImageSource: initialData?.matchedImageSource,
  }
  
  const [formData, setFormData] = useState<ReportFormData>({
    ...normalizedInitialData,
  })
  
  const [pendingData, setPendingData] = useState<ReportFormData | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [submitMessage, setSubmitMessage] = useState<string>('')
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | ''>('')
  const [showStatusPopup, setShowStatusPopup] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [matchResult, setMatchResult] = useState<any>(null)
  const [pendingExistingReportId, setPendingExistingReportId] = useState<number | null>(null)

  const submitMutation = useMutation({
    mutationFn: (data: FormData) => reportsApi.submit(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-reports'] })
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] })
      
      if (data.missing_fields === 'Missing') {
        const existingReportId = Number(data?.existing_report_id || 0) || null
        const matchedImageSource =
          data?.match_result?.matched_image?.source_url ||
          data?.match_result?.matched_image?.gdrive_view_link ||

          ''

        setPendingExistingReportId(existingReportId)

        setPendingData({
          ...formData,
          existingReportId: existingReportId || undefined,
          matchedImageSource,
        })
        setMatchResult(data.match_result || null)
        setShowModal(true)
        setSubmitStatus('')
        setSubmitMessage('')
        setShowStatusPopup(false)
      } else {
        setSubmitStatus('success')
        const successMessage = data.message || 'Report submitted successfully!'
        setSubmitMessage(`${successMessage} It is now being processed for admin validation.`)
        setShowStatusPopup(true)
        
        if (data.new_pending_claim) {
          setMatchResult({
            name: data.new_pending_claim.image?.split('/').pop() || 'Matched Item',
            gdrive_view_link: data.new_pending_claim.image,
          })
        }

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
      }
    },
    onError: (error: any) => {
      setSubmitStatus('error')
      setSubmitMessage(error.message || 'Failed to submit report')
      setShowStatusPopup(true)
    },
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const fileError = validateImageFile(file)
      if (fileError) {
        setSubmitStatus('error')
        setSubmitMessage(fileError)
        setShowStatusPopup(true)
        setFormData((prev) => ({ ...prev, photo: null }))
        setPhotoPreview('')
        e.target.value = ''
        return
      }

      setFormData((prev) => ({ ...prev, photo: file }))
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const fileError = validateImageFile(file)
    if (fileError) {
      setSubmitStatus('error')
      setSubmitMessage(fileError)
      setShowStatusPopup(true)
      setFormData((prev) => ({ ...prev, photo: null }))
      setPhotoPreview('')
      return
    }

    setFormData((prev) => ({ ...prev, photo: file }))
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitMessage('')
    setSubmitStatus('')
    setShowStatusPopup(false)

    if (formData.status === 'found' && (!formData.studentName || !formData.studentNumber || !formData.contactInfo)) {
      setPendingData(formData)
      setShowModal(true)
      return
    }

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

    submitMutation.mutate(formDataToSend)
  }

  const handlePersonalInfoSubmit = async (info: { studentName: string; studentNumber: string; contactInfo: string }) => {
    if (!pendingData) return
    
    setShowModal(false)

    setFormData((prev) => ({
      ...prev,
      studentName: info.studentName,
      studentNumber: info.studentNumber,
      contactInfo: info.contactInfo,
    }))
    
    const existingReportId = pendingData.existingReportId || pendingExistingReportId
    const formDataToSend = new FormData()
    if (existingReportId) {
      formDataToSend.append('existing_report_flow', '1')
      formDataToSend.append('existing_report_id', String(existingReportId))
      if (pendingData.matchedImageSource) {
        formDataToSend.append('matched_image_source', pendingData.matchedImageSource)
      }
      formDataToSend.append('description', pendingData.description)
    } else {
      if (matchResult && pendingData.status === 'lost') {
        setSubmitStatus('error')
        setSubmitMessage('Unable to continue matched report flow. Please submit again.')
        setShowStatusPopup(true)
        return
      }
      formDataToSend.append('item_name', pendingData.itemName)
      formDataToSend.append('description', pendingData.description)
      formDataToSend.append('status', pendingData.status)
      formDataToSend.append('location', pendingData.location)
      formDataToSend.append('date', pendingData.date)
      formDataToSend.append('time', pendingData.time || '')
      if (pendingData.photo) {
        formDataToSend.append('image', pendingData.photo)
      }
    }
    formDataToSend.append('student_name', info.studentName)
    formDataToSend.append('student_number', info.studentNumber)
    formDataToSend.append('contact_info', info.contactInfo)

    submitMutation.mutate(formDataToSend)
    setPendingData(null)
    setPendingExistingReportId(null)
  }

  const charCount = formData.description.length
  const progress = Math.min((charCount / MAX_CHARS) * 100, 100)

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 lg:p-10">
      {matchResult && <MatchResultCard match={matchResult} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
            <FileText size={18} className="text-[#0217f7]" />
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
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <FileText size={18} className="text-[#0217f7]" />
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
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0217f7] to-[#f5e102] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{charCount}/{MAX_CHARS}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <Sparkles size={18} className="text-[#0217f7]" />
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="input-field appearance-none bg-white"
            >
              <option value="">Select status</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <MapPin size={18} className="text-[#0217f7]" />
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <Calendar size={18} className="text-[#0217f7]" />
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <Calendar size={18} className="text-[#0217f7]" />
              Time <span className="text-gray-600 text-xs">(Optional)</span>
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
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
            <Camera size={18} className="text-[#0217f7]" />
            Photo <span className="text-gray-600 text-xs">(Optional)</span>
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#0217f7] transition-all cursor-pointer group"
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
                <p className="text-gray-700">
                  <span className="text-[#0217f7] font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-600">JPEG, PNG (Max 5MB)</p>
              </div>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handlePhotoUpload}
              className={`absolute inset-0 w-full h-full opacity-0 ${photoPreview ? 'pointer-events-none' : 'cursor-pointer'}`}
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
              <><Loader2 size={20} className="animate-spin" /> Processing...</>
            ) : (
              <><Sparkles size={20} className="text-[#f5e102]" /> Submit Report</>
            )}
          </button>
          <button 
            type="button" 
            onClick={() => navigate({ to: '/' })} 
            className="flex-1 btn-secondary py-3"
          >
            Cancel
          </button>
        </div>
      </form>

      <PersonalInfoModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setPendingData(null)
          setPendingExistingReportId(null)
        }}
        onSubmit={handlePersonalInfoSubmit}
        isLoading={submitMutation.isPending}
        matchFound={!!matchResult}
      />

      {showStatusPopup && submitMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setShowStatusPopup(false)}
          role="presentation"
        >
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
              submitStatus === 'success'
                ? 'bg-white text-green-900 border-green-200'
                : 'bg-white text-red-900 border-red-200'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
          >
            <div
              className={`h-1.5 w-full ${
                submitStatus === 'success' ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-400 via-rose-500 to-red-600'
              }`}
            />

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    submitStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {submitStatus === 'success' ? <Sparkles size={20} /> : <X size={20} />}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    {submitStatus === 'success' ? 'Submission Received' : 'Submission Failed'}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-gray-700">{submitMessage}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStatusPopup(false)}
                className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  submitStatus === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {submitStatus === 'success' ? 'Great, thanks' : 'Try again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}