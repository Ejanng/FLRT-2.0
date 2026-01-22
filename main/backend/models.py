from config import db
from datetime import datetime, timezone

class Users(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)
    student_number = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=True)           # recovery option
    password_hash = db.Column(db.String(255), nullable=False)       
    contact_info = db.Column(db.String(100), nullable=False)                # to contact the user required talaga
    registered_on = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)  

    report = db.relationship("Reports", back_populates="user", lazy=True)
    claimants = db.relationship("Claimants", back_populates="user", lazy=True)

    def to_json(self):
        return {
            'user_id': self.user_id,
            'student_number': self.student_number,
            'email': self.email,
            'contact_info': self.contact_info,
            'registered_on': self.registered_on.isoformat()
        }


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

# class Locations(db.Model):