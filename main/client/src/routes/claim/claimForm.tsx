import { createFileRoute } from '@tanstack/react-router';
import '../../styles.css';

type ClaimFormSearch = {
  id: string;
  name: string;
  location: string;
  date: string;
  category: string;
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
      location: cleanString(search.location),
      date: cleanString(search.date),
      category: cleanString(search.category),
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id, name, location, date, category } = Route.useSearch();

  console.log('ClaimForm rendering with:', { id, name, location, date, category });

  return (
    <div className="claim-page">
      <div className="claim-card">

        {/* Hidden fields for backend submission */}
        <input type="hidden" name="itemId" value={id} />
        <input type="hidden" name="itemName" value={name} />
        <input type="hidden" name="itemLocation" value={location} />
        <input type="hidden" name="itemDate" value={date} />
        <input type="hidden" name="itemCategory" value={category} />

        {/* Student info only */}
        <div className="claim-form-group">
          <label htmlFor="claimantName">Your Name *</label>
          <input
            type="text"
            id="claimantName"
            name="claimantName"
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
            required
            placeholder="Enter your student number"
          />
        </div>

        <div className="claim-form-group">
          <label htmlFor="description">Description / Proof of Ownership *</label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            placeholder="Describe the item and provide proof of ownership..."
          />
        </div>

        <div className="claim-form-group">
          <label>Upload Proof of Ownership *</label>
          <div className="claim-photo-upload-area">
            <div className="claim-upload-text">Click to upload proof image</div>
            <div className="claim-upload-formats">JPG, PNG (Max 5MB)</div>
            <input
              type="file"
              accept="image/*"
              className="claim-photo-input"
              required
            />
          </div>
        </div>

        <div className="claim-form-actions">
          <button type="submit" className="claim-submit-btn">Submit Claim</button>
          <button type="button" className="claim-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
}
