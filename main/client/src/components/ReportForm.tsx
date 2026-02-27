import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import "../styles.css";

const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  const initialFormData = {
    itemName: "",
    description: "",
    status: "",
    location: "",
    date: "",
    photo: null as File | null,
  };
  const [formData, setFormData] = useState({
    ...initialFormData,
  });

  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const dataToSend = new FormData();
  dataToSend.append("itemName", formData.itemName);
  dataToSend.append("description", formData.description);
  dataToSend.append("status", formData.status);
  dataToSend.append("location", formData.location);
  dataToSend.append("date", formData.date);

  if (formData.photo) {
    dataToSend.append("photo", formData.photo);
  }

  try {
    const response = await fetch("http://localhost:5000/reports/reports", {
      method: "POST",
      body: dataToSend,
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Form submitted successfully:", data);
      setSubmitStatus("success");
      setSubmitMessage("Report submitted successfully!");
      setFormData(initialFormData);
      setPhotoPreview("");
    } else {
      const errorBody = await response.json().catch(() => null);
      const errorMessage = errorBody?.error || "Failed to submit report.";
      console.error("Failed to submit report:", errorMessage);
      setSubmitStatus("error");
      setSubmitMessage(`${errorMessage} Please try again.`);
    }
  } catch (error) {
    console.error("Error submitting report:", error);
    setSubmitStatus("error");
    setSubmitMessage("An error occurred. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};
  const characterCount = formData.description.length;
  const maxCharacters = 1000;
  const minCharacters = 10;

  return (
    <div className="reports-page">
      <div className="report-container">
        <form className="report-form" onSubmit={handleSubmit}>
          {submitMessage && (
            <div className={`form-message ${submitStatus === "success" ? "success" : "error"}`}>
              {submitMessage}
            </div>
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
              placeholder="Provide detailed description (color, size, distinguishing features)"
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

          {/* Photo Upload */}
          <div className="form-group">
            <label htmlFor="photo">Item Photo (Optional)</label>
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
            <button type="submit" className="btn primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
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
    </div>
  );
};

export default ReportForm;
