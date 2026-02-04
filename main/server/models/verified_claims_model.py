from core.extensions import db
from datetime import datetime, timezone

class VerifiedClaims(db.Model):
    __tablename__ = 'verified_claims'

    verified_claim_id = db.Column(db.Integer, primary_key=True)
    submit_claim_id = db.Column(db.Integer, db.ForeignKey('submit_claims.submit_claim_id'), nullable=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    verification_date = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)
    verification_status = db.Column(db.String(50), nullable=False)  # approved, rejected
    remarks = db.Column(db.String(255), nullable=True)

    submit_claim = db.relationship("SubmitClaims", back_populates="verified_claims", lazy="select")
    user = db.relationship("Users", back_populates="verified_claims", lazy="select")

    print("VerifiedClaims model loaded")
    def to_json(self):
        return {
            'verified_claim_id': self.verified_claim_id,
            'submit_claim_id': self.submit_claim_id,
            'verified_by': self.verified_by,
            'verification_date': self.verification_date.isoformat(),
            'verification_status': self.verification_status,
            'remarks': self.remarks
        }