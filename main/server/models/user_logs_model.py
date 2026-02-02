from core.extensions import db
from datetime import datetime, timezone


# record user like logging in, reporting, claiming, etc. for statistics
class UserLog(db.Model):
    __tablename__ = 'user_logs'

    log_id = db.Column(db.Integer, primary_key=True)
    last_seen = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)
    action = db.Column(db.String(50), nullable=False) # e.g. 'login', 'reported', 'claimed'
    details = db.Column(db.String(255), nullable=True) # additional details about the action
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    user = db.relationship("Users", back_populates="logs", lazy="select")

    print("UserLog model loaded")
    def to_json(self):
        return {
            'log_id': self.log_id,
            'user_id': self.user_id,
            'last_seen': self.last_seen.isoformat(),
            'action': self.action,
            'details': self.details
        }