from core.extensions import db
from datetime import datetime, timezone

class SuccessClaimed(db.Model):
    __tablename__ = 'success_claimed'

    claimant_id = db.Column(db.Integer, primary_key=True)
    lost_object_id = db.Column(db.Integer, db.ForeignKey('lost_reports.lost_object_id'), nullable=True)     # for now nullable since i dunno if the frontend includes both lost and found claims
    found_object_id = db.Column(db.Integer, db.ForeignKey('found_reports.found_object_id'), nullable=True)  # same here
    claimed_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    contact_info = db.Column(db.String(100), nullable=False)
    claimed_date = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)


    lost_report = db.relationship("LostReports", back_populates="claimed", lazy="select")
    found_report = db.relationship("FoundReports", back_populates="claimed", lazy="select")
    user = db.relationship("Users", back_populates="claimed", lazy="select")

    print("SuccessClaimed model loaded")
    def to_json(self):
        return {
            'claimant_id': self.claimant_id,
            'lost_object_id': self.lost_object_id,
            'found_object_id': self.found_object_id,
            'claimed_by': self.claimed_by,
            'contact_info': self.contact_info,
            'claimed_date': self.claimed_date.isoformat()
        }
