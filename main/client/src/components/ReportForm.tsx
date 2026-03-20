import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import "../styles.css";

// Types
interface ReportFormData {
  itemName: string;
  description: string;
  status: "lost" | "found" | "";
  location: string;
  date: string;
  time?: string;
  photo: File | null;
  // Optional personal info (required for lost items with matches)
  studentName?: string;
  studentNumber?: string;
  contactInfo?: string;
}

interface ApiResponse {
  message: string;
  report: {
    report_id: number;
    item_name: string;
    description: string;
    status: string;
    location: string;
    date_reported: string;
    image?: string;
  };
  new_pending_claim?: {
    claim_id: number;
    report_id: number;
    student_name: string;
    student_number: string;
    contact_info: string;
    status: string;
    image: string;
    date_claimed: string;
  };
  match_result?: string;
  missing_fields?: string;
}

interface MatchResult {
  name: string;
  score: number;
  source_url?: string;
  gdrive_view_link?: string;
}

// Personal Info Modal Component
const PersonalInfoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (info: {
    studentName: string;
    studentNumber: string;
    contactInfo: string;
  }) => void;
  isLoading: boolean;
  matchFound: boolean;
}> = ({ isOpen, onClose, onSubmit, isLoading, matchFound }) => {
  const [info, setInfo] = useState({
    studentName: "",
    studentNumber: "",
    contactInfo: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!info.studentName.trim()) newErrors.studentName = "Required";
    if (!info.studentNumber.trim()) newErrors.studentNumber = "Required";
    if (!info.contactInfo.trim()) {
      newErrors.contactInfo = "Required";
    } else if (
      !info.contactInfo.includes("@") &&
      !info.contactInfo.startsWith("09")
    ) {
      newErrors.contactInfo = "Enter valid email or phone";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(info);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Additional Information Required</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {matchFound && (
          <div className="match-alert">
            <span className="match-icon">✓</span>
            <p>
              A potential match was found! Please provide your contact details to
              proceed with the claim.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="personal-info-form">
          <div className="form-group">
            <label>
              Student Name <span className="required">*</span>
            </label>
            <input
              type="text"
              value={info.studentName}
              onChange={(e) =>
                setInfo((prev) => ({ ...prev, studentName: e.target.value }))
              }
              placeholder="Juan Dela Cruz"
              className={errors.studentName ? "error" : ""}
            />
            {errors.studentName && (
              <span className="error-text">{errors.studentName}</span>
            )}
          </div>

          <div className="form-group">
            <label>
              Student Number <span className="required">*</span>
            </label>
            <input
              type="text"
              value={info.studentNumber}
              onChange={(e) =>
                setInfo((prev) => ({ ...prev, studentNumber: e.target.value }))
              }
              placeholder="2024-12345"
              className={errors.studentNumber ? "error" : ""}
            />
            {errors.studentNumber && (
              <span className="error-text">{errors.studentNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label>
              Contact Info (Email/Phone) <span className="required">*</span>
            </label>
            <input
              type="text"
              value={info.contactInfo}
              onChange={(e) =>
                setInfo((prev) => ({ ...prev, contactInfo: e.target.value }))
              }
              placeholder="juan@example.com or 09123456789"
              className={errors.contactInfo ? "error" : ""}
            />
            {errors.contactInfo && (
              <span className="error-text">{errors.contactInfo}</span>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={isLoading}>
              {isLoading ? "Submitting..." : matchFound ? "Create Claim" : "Complete Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Match Result Card Component
const MatchResultCard: React.FC<{ match: MatchResult }> = ({ match }) => {
  return (
    <div className="match-result-card">
      <div className="match-header">
        <span className="match-badge">Potential Match Found</span>
        <span className="match-score">Score: {match.score}</span>
      </div>
      <div className="match-details">
        <p>
          <strong>Matched Item:</strong> {match.name}
        </p>
        {match.gdrive_view_link && (
          <a
            href={match.gdrive_view_link}
            target="_blank"
            rel="noopener noreferrer"
            className="view-image-link"
          >
            View Matched Image →
          </a>
        )}
      </div>
    </div>
  );
};

const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  
  const initialFormData: ReportFormData = {
    itemName: "",
    description: "",
    status: "",
    location: "",
    date: "",
    time: "",
    photo: null,
  };

  const [formData, setFormData] = useState<ReportFormData>({ ...initialFormData });
  const [pendingData, setPendingData] = useState<ReportFormData | null>(null);
  
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // TanStack Query Mutation - image now optional
  const submitMutation = useMutation({
    mutationFn: async (data: ReportFormData): Promise<ApiResponse> => {
      const formDataToSend = new FormData();
      formDataToSend.append("item_name", data.itemName);
      formDataToSend.append("description", data.description);
      formDataToSend.append("status", data.status);
      formDataToSend.append("location", data.location);
      formDataToSend.append("date", data.date);
      formDataToSend.append("time", data.time || "");

      // Image is now optional - only append if exists
      if (data.photo) {
        formDataToSend.append("image", data.photo);
      }

      if (data.studentName) {
        formDataToSend.append("student_name", data.studentName);
        formDataToSend.append("student_number", data.studentNumber || "");
        formDataToSend.append("contact_info", data.contactInfo || "");
      }

      const response = await fetch("http://localhost:5000/reports/report-item", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Failed to submit report";
        try {
          const errorJson = JSON.parse(text);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Only show personal info modal if match found AND missing fields
      if (data.missing_fields === "Missing") {
        setPendingData(variables);
        const hasMatch = data.message.toLowerCase().includes("match found");
        if (hasMatch) {
          setMatchResult({
            name: "Potential Match",
            score: 0,
            source_url: undefined,
          });
        }
        setShowPersonalInfoModal(true);
        return;
      }

      setSubmitStatus("success");
      setSubmitMessage(data.message);

      if (data.new_pending_claim) {
        setMatchResult({
          name: data.new_pending_claim.image.split("/").pop() || "Matched Item",
          score: 0,
          source_url: data.new_pending_claim.image,
          gdrive_view_link: data.new_pending_claim.image,
        });
      }

      setFormData(initialFormData);
      setPhotoPreview("");
    },
    onError: (error) => {
      setSubmitStatus("error");
      setSubmitMessage(
        error instanceof Error ? error.message : "An error occurred. Please try again."
      );
    },
  });

  const isLoading = submitMutation.isPending || isSubmitting;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setFormData((prev) => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");
    setSubmitStatus("");

    try {
      await submitMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonalInfoSubmit = (info: {
    studentName: string;
    studentNumber: string;
    contactInfo: string;
  }) => {
    if (!pendingData) return;

    const completeData: ReportFormData = {
      ...pendingData,
      studentName: info.studentName,
      studentNumber: info.studentNumber,
      contactInfo: info.contactInfo,
    };

    setShowPersonalInfoModal(false);
    setPendingData(null);
    submitMutation.mutate(completeData);
  };

  const characterCount = formData.description.length;
  const maxCharacters = 1000;
  const minCharacters = 10;

  return (
    <div className="reports-page">
      <div className="report-container">
        <form className="report-form" onSubmit={handleSubmit}>
          {submitMessage && (
            <div
              className={`form-message ${
                submitStatus === "success" ? "success" : "error"
              }`}
            >
              {submitMessage}
            </div>
          )}

          {/* Match Result Card */}
          {matchResult && submitStatus === "success" && (
            <MatchResultCard match={matchResult} />
          )}

          {/* Item Name */}
          <div className="form-group">
            <label htmlFor="itemName">
              Item Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="itemName"
              name="itemName"
              value={formData.itemName}
              onChange={handleInputChange}
              placeholder="e.g., Black Backpack, iPhone 13, Keys"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide detailed description (color, size, distinguishing features, brand, etc.)"
              rows={5}
              maxLength={maxCharacters}
              required
            />
            <div className="character-count">
              {characterCount}/{maxCharacters} characters (minimum {minCharacters})
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label htmlFor="status">
              Status <span className="required">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
            >
              <option value="">Select status</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location">
              Location <span className="required">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Library 2nd Floor, CS Building Room 101"
              required
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date">
              Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
            <div className="field-helper">When was the item lost or found?</div>
          </div>

          {/* Time - Optional */}
          <div className="form-group">
            <label htmlFor="time">Time (Optional)</label>
            <input
              type="time"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
            />
          </div>

          {/* Photo Upload - Now Optional */}
          <div className="form-group">
            <label htmlFor="photo">
              Item Photo <span className="optional">(Optional - helps with matching)</span>
            </label>
            <div
              className="photo-upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {photoPreview ? (
                <div className="photo-preview">
                  <img src={photoPreview} alt="Item preview" />
                  <button
                    type="button"
                    className="remove-photo"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, photo: null }));
                      setPhotoPreview("");
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="upload-icon">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="upload-text">
                    <span className="upload-link">Click to upload</span> or drag and drop
                  </p>
                  <p className="upload-formats">JPEG, PNG, GIF, or WebP (Max 5MB)</p>
                  <p className="upload-hint">Adding a photo helps us match lost & found items automatically</p>
                </>
              )}
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePhotoUpload}
                className="photo-input"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={isLoading}>
              {isLoading ? "Processing..." : "Submit Report"}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => navigate({ to: "/" })}
            >
              Cancel Report
            </button>
          </div>
        </form>
      </div>

      {/* Personal Info Modal */}
      <PersonalInfoModal
        isOpen={showPersonalInfoModal}
        onClose={() => {
          setShowPersonalInfoModal(false);
          setPendingData(null);
          setMatchResult(null);
        }}
        onSubmit={handlePersonalInfoSubmit}
        isLoading={submitMutation.isPending}
        matchFound={!!matchResult}
      />
    </div>
  );
};

export default ReportForm;