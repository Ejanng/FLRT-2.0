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

export const Route = createFileRoute('/claim/claimForm')({
  validateSearch: (search: Record<string, unknown>): ClaimFormSearch => {
    const cleanString = (value: unknown): string => {
      if (typeof value !== 'string') return '';
      const trimmed = value.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    };

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
          </div>

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
}