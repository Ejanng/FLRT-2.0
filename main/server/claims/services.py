from models.pending_claims_model import db, PendingClaims
from models.reports_model import Reports
from models.admins_model import Admins
from models.returns_model import Returns

def submit_claim_item(data):
    student_number = data['student_number']

    report = Reports.query.filter(
        Reports.report_id == data['report_id'],
        Reports.status == 'found'
    ).first()

    if not report:
        return None
    
    new_claim = PendingClaims(
        report_id=report.report_id,
        student_name=data['student_name'],
        student_number=student_number,
        contact_info=data['contact_info'],
        description=data['description'],
        image=data.get('image')
    )

    db.session.add(new_claim)
    db.session.commit()

    return new_claim

def verify_claim_service(current_user, claim_id, status):
    claim = PendingClaims.query.filter_by(claim_id=claim_id).first()

    if not claim:
        return None, "Claim not found"

    if claim.status == 'verified':
        return claim.status, "Item already verified"
    
    if claim.status == 'rejected':
        return claim.status, "Claim has been rejected"


    admin_id = current_user.user_id
    admin = Admins.query.filter_by(user_id=admin_id).first()

    new_returns = Returns(
        admin_id=admin.user_id,
        report_id=claim.report_id,
        student_name=claim.student_name,
        student_number=claim.student_number,
        contact_info=claim.contact_info,
        description=claim.description,
        image=claim.image
    )
    db.session.add(new_returns)
    db.session.commit()

    # Update the claim status to 'verified'
    claim.status = status
    db.session.commit()

    return new_returns, None


# this function is to check if the user has already submitted a claim for the same item, it will return true if the user has already submitted a claim for the same item, otherwise it will return false
def is_user_already_submit_claim(student_number, report_id):
    existing_claim = PendingClaims.query.filter_by(
        student_number=student_number,
        report_id=report_id
    ).first()
    return existing_claim is not None
