from core.extensions import db
from datetime import datetime, timezone

class Reports(db.Model):
    __tablename__ = 'reports'

    report_id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False)  # lost, found, published_lost, published_found, returned
    location = db.Column(db.String(100), nullable=False)
    date_reported = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)
    time = db.Column(db.Time, nullable=True)
    image = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(50), nullable=True)  # Electronics, Accessories, Bags, Books, Stationery
    
    pending_claim = db.relationship("PendingClaims", back_populates="report", lazy="select")
    returns = db.relationship("Returns", back_populates="report", lazy="select")

    def to_json(self):
        return {
            'report_id': self.report_id,
            'item_name': self.item_name,
            'description': self.description,
            'status': self.status,
            'location': self.location,
            'date_reported': self.date_reported.isoformat(),
            'time': self.time.isoformat() if self.time else None,
            'image': self.image,
            'category': self.category
        }