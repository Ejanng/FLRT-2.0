<<<<<<< HEAD
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import '../../styles.css';

type ClaimFormSearch = {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
  category: string;
  status: string;
  image: string;
};
=======
// client/src/routes/claim/claimForm.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, User, IdCard, Mail, FileText, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { claimsApi, foundItemsApi } from '../../services/api'

type SearchParams = {
  id: string
  name: string
  location: string
  date: string
  category: string
  mode?: string
}
>>>>>>> beta-v2.0

export const Route = createFileRoute('/claim/claimForm')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    id: String(search.id || ''),
    name: String(search.name || ''),
    location: String(search.location || ''),
    date: String(search.date || ''),
    category: String(search.category || ''),
    mode: search.mode ? String(search.mode) : undefined,
  }),
  component: ClaimFormPage,
})

function ClaimFormPage() {
  const { id, name, location, date, category, mode } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isFoundFlow = mode === 'found'
  
  const [formData, setFormData] = useState({
    claimantName: '',
    claimantId: '',
    claimantContactInfo: '',
    description: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submitMutation = useMutation({
    mutationFn: (data: FormData) => isFoundFlow ? foundItemsApi.submit(data) : claimsApi.submit(data),
    onSuccess: () => {
      if (isFoundFlow) {
        queryClient.invalidateQueries({ queryKey: ['pending-found-items'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['pending-claims'] })
      }
      alert(
        isFoundFlow
          ? 'Submission received. The admin will contact you and verify the match.'
          : 'Claim submitted successfully! Please wait for admin approval.',
      )
      navigate({ to: '/claim' })
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to submit claim. Please try again.')
    },
  })

<<<<<<< HEAD
    return {
      id: cleanString(search.id),
      name: cleanString(search.name),
      description: cleanString(search.description),
      location: cleanString(search.location),
      date: cleanString(search.date),
      category: cleanString(search.category),
      status: cleanString(search.status),
      image: cleanString(search.image),
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id, name, location, date, category } = Route.useSearch();
  const navigate = useNavigate();
  const isMissingReportId = !id;
  
  const [file, setFile] = useState<File | null>(null);
  const [claimantName, setClaimantName] = useState('');
  const [claimantId, setClaimantId] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMissingReportId) {
      alert('Unable to submit claim because the selected report is missing. Please go back and select an item again.');
      return;
    }

    try {
      let response;

      if (file) {
        // Multipart/form-data if a file is uploaded
        const formData = new FormData();
        formData.append('image', file);
        formData.append('description', description);
        formData.append('student_name', claimantName);
        formData.append('student_number', claimantId);
        formData.append('contact_info', claimantEmail);
        formData.append('report_id', id);

        response = await fetch('http://localhost:5000/claims/claim-item', {
          method: 'POST',
          body: formData,
        });
      } else {
        // JSON payload if no file
        const payload = {
          student_name: claimantName,
          student_number: claimantId,
          contact_info: claimantEmail,
          report_id: id,
          description,
        };

        response = await fetch('http://localhost:5000/claims/claim-item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (response.ok) {
        alert(`Success: ${data.message}`);
        navigate({ to: '/' }); 
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="claim-page">
      <div className="claim-card">
        <form onSubmit={handleSubmit}>
          {/* Hidden backend fields */}
          <input type="hidden" name="itemId" value={id} />
          <input type="hidden" name="itemName" value={name} />
          <input type="hidden" name="itemLocation" value={location} />
          <input type="hidden" name="itemDate" value={date} />
          <input type="hidden" name="itemCategory" value={category} />

          {/* Student info */}
          <div className="claim-form-group">
            <label htmlFor="claimantName">Your Name *</label>
            <input
              type="text"
              id="claimantName"
              name="claimantName"
              value={claimantName}
              onChange={(e) => setClaimantName(e.target.value)}
              required
              placeholder="Enter your full name"
            />
=======
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.claimantName.trim()) newErrors.claimantName = 'Name is required'
    if (!formData.claimantId.trim()) newErrors.claimantId = 'Student number is required'
    if (!formData.claimantContactInfo.trim()) {
      newErrors.claimantContactInfo = 'Contact is required'
    }
    if (!formData.description.trim()) {
      newErrors.description = isFoundFlow
        ? 'Please provide important details for admin verification'
        : 'Proof of ownership is required'
    }
    // if (!photoFile) newErrors.photo = 'Proof image is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const formDataToSend = new FormData()
    
    if (isFoundFlow) {
      // Found items submission
      formDataToSend.append('finder_name', formData.claimantName)
      formDataToSend.append('finder_student_number', formData.claimantId)
      formDataToSend.append('finder_contact_info', formData.claimantContactInfo)
      formDataToSend.append('item_name', name)
      formDataToSend.append('item_description', formData.description)
      formDataToSend.append('item_location', location)
      formDataToSend.append('category', category)
      formDataToSend.append('date_found', new Date(date).toISOString())
    } else {
      // Regular claim submission
      formDataToSend.append('report_id', id)
      formDataToSend.append('claimantName', formData.claimantName)
      formDataToSend.append('claimantId', formData.claimantId)
      formDataToSend.append('claimantEmail', formData.claimantContactInfo)
      formDataToSend.append('contact_info', formData.claimantContactInfo)
      formDataToSend.append('description', formData.description)
    }
    
    if (photoFile) {
      formDataToSend.append('image', photoFile)
    }

    submitMutation.mutate(formDataToSend)
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
          <h2 className="text-sm font-semibold text-[#0217f7] dark:text-[#f5e102] mb-2">
            {isFoundFlow ? 'Found Item:' : 'Claiming:'} {name}
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div><span className="text-gray-500">Location:</span> {location}</div>
            <div><span className="text-gray-500">Date:</span> {new Date(date).toLocaleDateString()}</div>
            <div><span className="text-gray-500">Category:</span> {category}</div>
>>>>>>> beta-v2.0
          </div>

<<<<<<< HEAD
          <div className="claim-form-group">
            <label htmlFor="claimantId">Student Number *</label>
            <input
              type="text"
              id="claimantId"
              name="claimantId"
              value={claimantId}
              onChange={(e) => setClaimantId(e.target.value)}
              required
              placeholder="Enter your student number"
            />
          </div>

          <div className="claim-form-group">
            <label htmlFor="claimantEmail">Email *</label>
            <input
              type="email"
              id="claimantEmail"
              name="claimantEmail"
              value={claimantEmail}
              onChange={(e) => setClaimantEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="claim-form-group">
            <label htmlFor="description">Description / Proof of Ownership *</label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe the item and provide proof of ownership..."
            />
          </div>

          <div className="claim-form-group">
            <label>Upload Proof of Ownership</label>
            <div className="claim-photo-upload-area">
              <div className="claim-upload-text">Click to upload proof image</div>
              <div className="claim-upload-formats">JPG, PNG (Max 5MB)</div>
              <input
                type="file"
                accept="image/*"
                className="claim-photo-input"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    setFile(files[0]);
                  }
                }}
              />
            </div>
          </div>

          <div className="claim-form-actions">
            <button type="submit" className="claim-submit-btn" disabled={isMissingReportId}>Submit Claim</button>
            <button type="button" className="claim-cancel-btn" onClick={() => navigate({ to: '/claim' })}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
=======
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isFoundFlow ? 'I Found This Item' : 'Submit Claim'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {isFoundFlow
              ? 'Share your personal details so admins can contact you and coordinate the return with the owner.'
              : 'Provide your details and proof of ownership to claim this item.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <User size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Your Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={formData.claimantName}
                onChange={(e) => setFormData(prev => ({ ...prev, claimantName: e.target.value }))}
                placeholder="Full name"
                className={`input-field ${errors.claimantName ? 'border-red-500' : ''}`}
              />
              {errors.claimantName && <p className="text-red-500 text-xs mt-1">{errors.claimantName}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <IdCard size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Student Number <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={formData.claimantId}
                onChange={(e) => setFormData(prev => ({ ...prev, claimantId: e.target.value }))}
                placeholder="23-140123"
                className={`input-field ${errors.claimantId ? 'border-red-500' : ''}`}
              />
              {errors.claimantId && <p className="text-red-500 text-xs mt-1">{errors.claimantId}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Mail size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                Contacts <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={formData.claimantContactInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, claimantContactInfo: e.target.value }))}
                placeholder="Email or phone number"
                className={`input-field ${errors.claimantContactInfo ? 'border-red-500' : ''}`}
              />
              {errors.claimantContactInfo && <p className="text-red-500 text-xs mt-1">{errors.claimantContactInfo}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <FileText size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                {isFoundFlow ? 'Item/Find Details' : 'Proof of Ownership'} <span className="text-red-500">*</span>
              </label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4} 
                placeholder={isFoundFlow
                  ? 'Tell admins where and how you found this item, plus any useful identifying details.'
                  : 'Describe details only the owner would know (e.g., serial number, specific marks, contents...)'}
                className={`input-field resize-none ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Upload size={18} className="text-[#0217f7] dark:text-[#f5e102]" />
                {isFoundFlow ? 'Upload Item Photo' : 'Upload Proof Photo'} <span className="text-red-500">*</span>
              </label>
              <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                errors.photo ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600 hover:border-[#0217f7] dark:hover:border-[#f5e102]'
              }`}>
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img src={photoPreview} alt="Proof" className="max-h-48 rounded-xl" />
                    <button 
                      type="button" 
                      onClick={() => { setPhotoPreview(''); setPhotoFile(null); }}
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isFoundFlow ? 'Click to upload item photo' : 'Click to upload proof image'}
                    </p>
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
              {errors.photo && <p className="text-red-500 text-xs mt-1">{errors.photo}</p>}
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
                  <><CheckCircle size={20} /> {isFoundFlow ? 'Submit to Admin' : 'Submit Claim'}</>
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
>>>>>>> beta-v2.0
}