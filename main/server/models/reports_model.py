from core.extensions import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class Reports(db.Model):
    __tablename__ = 'reports'
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('lost', 'found', 'published_lost', 'published_found', 'returned')",
            name='ck_reports_status_valid',
        ),
        db.Index('ix_reports_status', 'status'),
        db.Index('ix_reports_date_reported', 'date_reported'),
        db.Index('ix_reports_category', 'category'),
    )

    report_id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False)  # lost, found, published_lost, published_found, returned
    location = db.Column(db.String(100), nullable=False)
    date_reported = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    time = db.Column(db.Time, nullable=True)
    image = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(50), nullable=True)  # Electronics, Accessories, Bags, Books, Stationery

    pending_claims = db.relationship(
        "PendingClaims",
        back_populates="report",
        lazy="select",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    returns = db.relationship(
        "Returns",
        back_populates="report",
        lazy="select",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def pending_claim(self):
        return self.pending_claims

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