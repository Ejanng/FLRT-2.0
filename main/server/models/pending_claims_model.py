from core.extensions import db
from datetime import datetime, timezone

class PendingClaims(db.Model):
    __tablename__ = 'pending_claims'

    claim_id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.report_id'), nullable=False)
    student_name = db.Column(db.String(100), nullable=True)
    student_number = db.Column(db.String(20), nullable=True)
    contact_info = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)  # Proof of ownership description
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, accepted, rejected
    image = db.Column(db.String(255), nullable=True)  # Proof image
    date_claimed = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)

    report = db.relationship("Reports", back_populates="pending_claim", lazy="select")

    def to_json(self):
        return {
            'claim_id': self.claim_id,
            'report_id': self.report_id,
            'student_name': self.student_name,
            'student_number': self.student_number,
            'contact_info': self.contact_info,
            'description': self.description,
            'status': self.status,
            'image': self.image,
            'date_claimed': self.date_claimed.isoformat()
        }