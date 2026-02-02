from core.extensions import db
from datetime import datetime, timezone

class Users(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)
    student_number = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=True)           # recovery option
    password_hash = db.Column(db.String(255), nullable=False)       
    role = db.Column(db.String(20), nullable=False, default='user')         # user or admin or superadmin
    status = db.Column(db.String(20), nullable=True)                       # active, suspended, deactivated
    contact_info = db.Column(db.String(100), nullable=False)                # to contact the user required talaga
    registered_on = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)  

    lost_report = db.relationship("LostReports", back_populates="user", lazy="select")
    found_report = db.relationship("FoundReports", back_populates="user", lazy="select")
    claimed = db.relationship("SuccessClaimed", back_populates="user", lazy="select")
    logs = db.relationship("UserLog", back_populates="user", lazy="select")

    print("Users model loaded")
    def to_json(self):
        return {
            'user_id': self.user_id,
            'student_number': self.student_number,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'contact_info': self.contact_info,
            'registered_on': self.registered_on.isoformat()  
        }