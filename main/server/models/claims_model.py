from core.extensions import db
from datetime import datetime, timezone

class Claimants(db.Model):
    __tablename__ = 'claimants'

    claimant_id = db.Column(db.Integer, primary_key=True)
    object_id = db.Column(db.Integer, db.ForeignKey('reports.object_id'), nullable=False)
    contact_info = db.Column(db.String(100), nullable=False)
    claim_date = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    report = db.relationship("Reports", back_populates="claimants", lazy=True)
    user = db.relationship("Users", back_populates="claimants", lazy=True)

    def to_json(self):
        return {
            'claimant_id': self.claimant_id,
            'object_id': self.object_id,
            'claimed_by': self.user.student_number,
            'contact_info': self.contact_info,
            'claim_date': self.claim_date.isoformat()
        }
