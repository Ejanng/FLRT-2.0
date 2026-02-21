from core.extensions import db
from datetime import datetime, timezone

class Claims(db.Model):
    __tablename__ = 'claims'

    claims_id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, nullable=False)     # ID of the report being claimed
    student_name = db.Column(db.String(100), nullable=False)      # name of the student claiming the item
    student_number = db.Column(db.String(20), nullable=False)     # student number of the claimant
    contact_info = db.Column(db.String(100), nullable=False)     # contact information of the claimant
    description = db.Column(db.Text, nullable=False)            # description of the claim
    image = db.Column(db.String(255), nullable=True)            # image of the claim
    date_claimed = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)  # date when the claim was made

    lost_report = db.relationship("LostReports", back_populates="user", lazy="select")

    print("Claims model loaded")
    
    def to_json(self):
        return {
            'claims_id': self.claims_id,
            'student_name': self.student_name,
            'student_number': self.student_number,
            'contact_info': self.contact_info,
            'description': self.description,
            'image': self.image,
            'date_claimed': self.date_claimed.isoformat()
        }