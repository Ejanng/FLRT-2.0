import { useState } from 'react'
import { X, CheckCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (info: { studentName: string; studentNumber: string; contactInfo: string }) => void
  isLoading: boolean
  matchFound: boolean
}

export default function PersonalInfoModal({ isOpen, onClose, onSubmit, isLoading, matchFound }: Props) {
  const [info, setInfo] = useState({ studentName: '', studentNumber: '', contactInfo: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!info.studentName.trim()) newErrors.studentName = 'Required'
    if (!info.studentNumber.trim()) newErrors.studentNumber = 'Required'
    if (!info.contactInfo.trim()) {
      newErrors.contactInfo = 'Required'
    } else if (!info.contactInfo.includes('@') && !info.contactInfo.startsWith('0')) {
      newErrors.contactInfo = 'Enter valid email or phone'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit(info)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Info</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {matchFound && (
          <div className="mb-4 bg-[#f5e102]/20 border border-[#f5e102] rounded-lg p-3 flex gap-3">
            <CheckCircle className="text-[#0217f7] flex-shrink-0" size={20} />
            <p className="text-sm text-gray-800">Match found! Provide contact details to proceed.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={info.studentName}
              onChange={(e) => setInfo((prev) => ({ ...prev, studentName: e.target.value }))}
              placeholder="Juan Dela Cruz"
              className={`input-field ${errors.studentName ? 'border-red-500' : ''}`}
            />
            {errors.studentName && <span className="text-xs text-red-500">{errors.studentName}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Student Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={info.studentNumber}
              onChange={(e) => setInfo((prev) => ({ ...prev, studentNumber: e.target.value }))}
              placeholder="23-140123"
              className={`input-field ${errors.studentNumber ? 'border-red-500' : ''}`}
            />
            {errors.studentNumber && <span className="text-xs text-red-500">{errors.studentNumber}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contact <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={info.contactInfo}
              onChange={(e) => setInfo((prev) => ({ ...prev, contactInfo: e.target.value }))}
              placeholder="juan@email.com or 09123456789"
              className={`input-field ${errors.contactInfo ? 'border-red-500' : ''}`}
            />
            {errors.contactInfo && <span className="text-xs text-red-500">{errors.contactInfo}</span>}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 btn-primary">
              {isLoading ? 'Submitting...' : 'Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}