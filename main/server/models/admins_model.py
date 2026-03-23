from core.extensions import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class Admins(db.Model):
    __tablename__ = 'admins'
    __table_args__ = (
        db.CheckConstraint("role IN ('admin', 'superadmin')", name='ck_admins_role_valid'),
        db.UniqueConstraint('username', name='uq_admins_username'),
        db.UniqueConstraint('email', name='uq_admins_email'),
        db.Index('ix_admins_email', 'email'),
    )

    admin_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)      # name of the admin
    password = db.Column(db.String(255), nullable=False)     # password of the admin
    email = db.Column(db.String(100), nullable=False)        # email of the admin
    role = db.Column(db.String(20), nullable=False, default='admin')         # role of the admin (admin or superadmin)
    date_created = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)  # date when the admin account was created
    date_updated = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)  # date when the admin account was last updated

    returns = db.relationship("Returns", back_populates="admin", lazy="select", passive_deletes=True)
    found_items = db.relationship(
        "FoundItems",
        back_populates="admin",
        lazy="select",
        passive_deletes=True,
    )

    def to_json(self):
        return {
            'admin_id': self.admin_id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'date_created': self.date_created.isoformat(),
            'date_updated': self.date_updated.isoformat()
        }