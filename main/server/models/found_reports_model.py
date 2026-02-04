from core.extensions import db
from datetime import datetime, timezone

class FoundReports (db.Model):
    __tablename__ = "found_reports"

    found_object_id = db.Column(db.Integer, primary_key=True)
    found_object_name = db.Column(db.String(100), nullable=False)         
    found_category = db.Column(db.String(50), default='found')                     
    found_description = db.Column(db.String(255), nullable=False)
    found_date_reported = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)                  # change in the future to include date reported
    found_last_location_seen = db.Column(db.String(100), nullable=False)
    found_status = db.Column(db.String(50), nullable=False, default='reported')   # reported, verifying, returned
    found_image_url = db.Column(db.String(255), nullable=True)

    found_by = db.Column(db.String(20), db.ForeignKey('users.student_number'), nullable=False)

    user = db.relationship("Users", back_populates="found_report", lazy="select")
    claimed = db.relationship('SuccessClaimed', back_populates="found_report", lazy="select")
    submit_claims = db.relationship("SubmitClaims", back_populates="found_report", lazy="select")

    print("FoundReports model loaded")
    def to_json(self):
        return {
            'found_object_id': self.found_object_id,
            'found_object_name': self.found_object_name,
            'found_category': self.found_category,
            'found_by': self.found_by,
            'found_description': self.found_description,
            'found_date_reported': self.found_date_reported.isoformat(),
            'found_last_location_seen': self.found_last_location_seen,
            'found_status': self.found_status,
            'found_image_url': self.found_image_url,
        }

