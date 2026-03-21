from models.pending_claims_model import PendingClaims
from models.reports_model import Reports
from core.extensions import db

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
    ).first()
    return existing is not None