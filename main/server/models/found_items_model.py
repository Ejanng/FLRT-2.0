from core.extensions import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class FoundItems(db.Model):
    __tablename__ = 'found_items'
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('pending', 'contacted', 'returned', 'cancelled')",
            name='ck_found_items_status_valid',
        ),
        db.Index('ix_found_items_status', 'status'),
        db.Index('ix_found_items_date_submitted', 'date_submitted'),
        db.Index('ix_found_items_student_number', 'finder_student_number'),
        db.Index('ix_found_items_admin_id', 'admin_id'),
    )

    found_item_id = db.Column(db.Integer, primary_key=True)
    
    # Finder information
    finder_name = db.Column(db.String(100), nullable=False)
    finder_student_number = db.Column(db.String(20), nullable=False)
    finder_contact_info = db.Column(db.String(100), nullable=False)  # Email or phone
    
    # Found item details
    item_name = db.Column(db.String(100), nullable=False)
    item_description = db.Column(db.Text, nullable=True)
    item_location = db.Column(db.String(100), nullable=False)  # Where the item was found
    date_found = db.Column(db.Date, nullable=False)  # Date the item was found
    category = db.Column(db.String(50), nullable=True)  # Electronics, Accessories, Bags, Books, Stationery
    image = db.Column(db.String(255), nullable=True)  # Photo of found item
    
    # Status and tracking
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, contacted, returned, cancelled
    admin_notes = db.Column(db.Text, nullable=True)  # Notes from admin when contacting finder
    
    # Timestamps
    date_submitted = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    date_contacted = db.Column(db.DateTime(timezone=True), nullable=True)  # When admin contacted finder
    date_closed = db.Column(db.DateTime(timezone=True), nullable=True)  # When item was returned or cancelled
    
    # Admin interaction
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.admin_id', ondelete='SET NULL'), nullable=True)
    admin = db.relationship("Admins", lazy="select")

    def to_json(self):
        return {
            'found_item_id': self.found_item_id,
            'finder_name': self.finder_name,
            'finder_student_number': self.finder_student_number,
            'finder_contact_info': self.finder_contact_info,
            'item_name': self.item_name,
            'item_description': self.item_description,
            'item_location': self.item_location,
            'date_found': self.date_found.isoformat() if self.date_found else None,
            'category': self.category,
            'image': self.image,
            'status': self.status,
            'admin_notes': self.admin_notes,
            'date_submitted': self.date_submitted.isoformat(),
            'date_contacted': self.date_contacted.isoformat() if self.date_contacted else None,
            'date_closed': self.date_closed.isoformat() if self.date_closed else None,
            'admin_id': self.admin_id,
        }
