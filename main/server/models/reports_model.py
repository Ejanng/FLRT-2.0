from extensions import db

class Reports(db.Model):
    __tablename__ = 'reports'

    object_id = db.Column(db.Integer, primary_key=True)             
    object_name = db.Column(db.String(100), nullable=False)         
    category = db.Column(db.String(50), nullable=False)                     # lost or found
    description = db.Column(db.String(255), nullable=False)
    date_reported = db.Column(db.DateTime, nullable=False)                  # change in the future to include date reported and date found
    last_location = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='reported')   # reported, claimed, returned
    image_url = db.Column(db.String(255), nullable=True)

    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    user = db.relationship("Users", back_populates="report", lazy=True)
    claimants = db.relationship('Claimants', back_populates='report', lazy=True)

    def to_json(self):
        return {
            'object_id': self.object_id,
            'object_name': self.object_name,
            'reported_by': self.user.student_number,
            'category': self.category,
            'description': self.description,
            'date_reported': self.date_reported.isoformat(),
            'last_location': self.last_location,
            'status': self.status,
            'image_url': self.image_url
        }
