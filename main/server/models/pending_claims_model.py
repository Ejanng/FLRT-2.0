from core.extensions import db
from datetime import datetime, timezone

class PendingClaims(db.Model):
    __tablename__ = 'pending_claims'

    claim_id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.report_id'), nullable=False)  # foreign key to the report being claimed
    student_name = db.Column(db.String(100), nullable=False)      # name of the student claiming the item
    student_number = db.Column(db.String(20), nullable=False)     # student number of the claimant
    contact_info = db.Column(db.String(100), nullable=False)     # contact information of the claimant
    description = db.Column(db.Text, nullable=False)            # description of the claim
    status = db.Column(db.String(20), nullable=False, default='pending')  # status of the claim (pending, accepted, rejected)
    image = db.Column(db.String(255), nullable=True)            # image of the claim
    date_claimed = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)  # date when the claim was made

    report = db.relationship("Reports", back_populates="pending_claim", lazy="select")

    print("PendingClaims model loaded")
    
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