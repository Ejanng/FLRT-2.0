from models.pending_claims_model import PendingClaims
from models.reports_model import Reports
from core.extensions import db

<<<<<<< HEAD

def get_all_claims():
    claims = PendingClaims.query.order_by(PendingClaims.date_claimed.desc()).all()

    return [
        {
            'claim_id': claim.claim_id,
            'report_id': claim.report_id,
            'item_name': claim.report.item_name if claim.report else None,
            'student_name': claim.student_name,
            'student_number': claim.student_number,
            'contact_info': claim.contact_info,
            'description': claim.description,
            'status': claim.status,
            'image': claim.image,
            'date_claimed': claim.date_claimed.isoformat() if claim.date_claimed else None,
        }
        for claim in claims
    ]

def submit_claim_item(data):
    student_number = data['student_number']

    report = Reports.query.filter(
        Reports.report_id == data['report_id'],
        Reports.status.in_(['found', 'lost', 'published', 'published_found', 'published_lost'])
=======
def get_claims_by_report(report_id):
    """Get all claims for a specific report."""
    claims = PendingClaims.query.filter_by(report_id=report_id).all()
    return [claim.to_json() for claim in claims]

def get_claims_by_student(student_number):
    """Get all claims by a specific student."""
    claims = PendingClaims.query.filter_by(student_number=student_number).all()
    return [claim.to_json() for claim in claims]

def check_existing_claim(report_id, student_number):
    """Check if student already claimed this report."""
    existing = PendingClaims.query.filter_by(
        report_id=report_id,
        student_number=student_number
>>>>>>> beta-v2.0
    ).first()
    return existing is not None