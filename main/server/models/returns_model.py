from core.extensions import db
from datetime import datetime, timezone

class Returns(db.Model):
    __tablename__ = 'returns'

    return_id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.admin_id'), nullable=False)  # foreign key to the admin who verified the return
    report_id = db.Column(db.Integer, db.ForeignKey('reports.report_id'), nullable=False)  # foreign key to the report being returned
    student_name = db.Column(db.String(100), nullable=False)      # name of the student returning the item
    student_number = db.Column(db.String(20), nullable=False)     # student number of the claimant
    contact_info = db.Column(db.String(100), nullable=False)     # contact information of the claimant
    description = db.Column(db.Text, nullable=False)            # description or instruction of the return
    status = db.Column(db.String(20), nullable=False, default='pending')  # status of the return (pending, returned)
    image = db.Column(db.String(255), nullable=True)            # image of the return
    date_returned = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)  # date when the return was made

    report = db.relationship("Reports", back_populates="returns", lazy="select")
    admin = db.relationship("Admins", back_populates="returns", lazy="select")

    print("Returns model loaded")
    
    def to_json(self):
        return {
            'return_id': self.return_id,
            'admin_id': self.admin_id,
            'report_id': self.report_id,
            'student_name': self.student_name,
            'student_number': self.student_number,
            'contact_info': self.contact_info,
            'description': self.description,
            'status': self.status,
            'image': self.image,
            'date_returned': self.date_returned.isoformat()
        }