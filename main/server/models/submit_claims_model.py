

from core.extensions import db
from datetime import datetime, timezone

class SubmitClaims(db.Model):
    __tablename__ = 'submit_claims'

    submit_claim_id = db.Column(db.Integer, primary_key=True)
    found_object_id = db.Column(db.Integer, db.ForeignKey('found_reports.found_object_id'), nullable=False)
    claim_object_name = db.Column(db.String(100), nullable=False)         
    claim_category = db.Column(db.String(50), default='claiming')
    claim_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    claim_description = db.Column(db.String(255), nullable=False)
    claim_date_reported = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)                  # change in the future to include date reported
    claim_last_location_seen = db.Column(db.String(100), nullable=False)          # implement the latitude and longtitude in the future
    claim_status = db.Column(db.String(50), nullable=False, default='verifying')   # reported, verifying, returned
    claim_image_url = db.Column(db.String(255), nullable=True)

    user = db.relationship("Users", back_populates="submit_claims", lazy="select")
    found_report = db.relationship("FoundReports", back_populates="submit_claims", lazy="select")
    verified_claims = db.relationship("VerifiedClaims", back_populates="submit_claim", lazy="select")

    print("SubmitClaims model loaded")
    def to_json(self):
        return {
            'submit_claim_id': self.submit_claim_id,
            'found_object_id': self.found_object_id,
            'claim_object_name': self.claim_object_name,
            'claim_category': self.claim_category,
            'claim_by': self.claim_by,
            'claim_description': self.claim_description,
            'claim_date_reported': self.claim_date_reported.isoformat(),
            'claim_last_location_seen': self.claim_last_location_seen,
            'claim_status': self.claim_status,
            'claim_image_url': self.claim_image_url
        }