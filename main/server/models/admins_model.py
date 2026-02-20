from core.extensions import db
from datetime import datetime, timezone

class Admins(db.Model):
    __tablename__ = 'admins'

    admin_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)      # name of the admin
    password = db.Column(db.String(255), nullable=False)     # password of the admin
    email = db.Column(db.String(100), nullable=False)        # email of the admin
    role = db.Column(db.String(20), nullable=False)         # role of the admin (admin or superadmin)
    date_created = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)  # date when the admin account was created
    date_updated = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)  # date when the admin account was last updated

    print("Admins model loaded")

    def to_json(self):
        return {
            'admin_id': self.admin_id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'date_created': self.date_created.isoformat(),
            'date_updated': self.date_updated.isoformat()
        }