from core.extensions import db
from datetime import datetime, timezone

class LostReports(db.Model):
    __tablename__ = 'lost_reports'

    lost_object_id = db.Column(db.Integer, primary_key=True)             
    lost_object_name = db.Column(db.String(100), nullable=False)         
    lost_category = db.Column(db.String(50), default='lost')
    lost_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    lost_description = db.Column(db.String(255), nullable=False)
    lost_date_reported = db.Column(db.DateTime, nullable=False)                  # change in the future to include date reported
    lost_last_location_seen = db.Column(db.String(100), nullable=False)          # implement the latitude and longtitude in the future
    lost_status = db.Column(db.String(50), nullable=False, default='reported')   # reported, verifying, returned
    lost_image_url = db.Column(db.String(255), nullable=True)


    user = db.relationship("Users", back_populates="lost_report", lazy="select")
    claimed = db.relationship('SuccessClaimed', back_populates="lost_report", lazy="select")

    print("LostReports model loaded")
    def to_json(self):
        return {
            'lost_object_id': self.lost_object_id,
            'lost_object_name': self.lost_object_name,
            'lost_category': self.lost_category,
            'lost_by': self.found_by,
            'lost_description': self.lost_description,
            'lost_date_reported': self.lost_date_reported.isoformat(),
            'lost_last_location': self.lost_last_location,
            'lost_status': self.lost_status,
            'lost_image_url': self.lost_image_url
        }
