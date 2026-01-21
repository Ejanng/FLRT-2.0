from config import db

class Reports(db.Model):
    object_id = db.Column(db.Integer, primary_key=True)
    object_name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    date_reported = db.Column(db.DateTime, nullable=False)
    last_location = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    reporter_contact = db.Column(db.String(100), nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    
    def to_json(self):
        return {
            'object_id': self.object_id,
            'object_name': self.object_name,
            'category': self.category,
            'description': self.description,
            'date_reported': self.date_reported.isoformat(),
            'last_location': self.last_location,
            'status': self.status,
            'reporter_contact': self.reporter_contact,
            'image_url': self.image_url
        }
    
