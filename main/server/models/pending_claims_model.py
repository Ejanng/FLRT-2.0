from core.extensions import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class PendingClaims(db.Model):
    __tablename__ = 'pending_claims'
    __table_args__ = (
        db.CheckConstraint("status IN ('pending', 'accepted', 'rejected')", name='ck_pending_claims_status_valid'),
        db.Index('ix_pending_claims_report_id', 'report_id'),
        db.Index('ix_pending_claims_status', 'status'),
        db.Index('ix_pending_claims_student_number', 'student_number'),
        db.Index('ix_pending_claims_date_claimed', 'date_claimed'),
    )

    claim_id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.report_id', ondelete='CASCADE'), nullable=False)
    student_name = db.Column(db.String(100), nullable=True)
    student_number = db.Column(db.String(20), nullable=True)
    contact_info = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)  # Proof of ownership description
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, accepted, rejected
    image = db.Column(db.String(255), nullable=True)  # Proof image
    date_claimed = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    report = db.relationship("Reports", back_populates="pending_claims", lazy="select")

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