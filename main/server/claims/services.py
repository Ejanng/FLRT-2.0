from models.success_claimed_model import SuccessClaimed, db
from models.users_model import Users
from models.found_reports_model import FoundReports
from models.lost_reports_model import LostReports
from models.submit_claims_model import SubmitClaims
from models.verified_claims_model import VerifiedClaims

def submit_claim_item(current_user, data):
    user_id = current_user.user_id
    users = Users.query.filter_by(user_id=user_id).first()

    found_report = FoundReports.query.filter(
        FoundReports.found_object_id == data['found_object_id'],
        FoundReports.found_status == 'reported'
    ).first()

    if not found_report:
        return None
    
    new_claim = SubmitClaims(
        found_object_id=found_report.found_object_id,
        claim_object_name=data['claim_object_name'],
        claim_category=data['claim_category'],
        claim_by=users.user_id,
        claim_description=data['claim_description'],
        claim_last_location_seen=data['claim_last_location_seen'],
        claim_image_url=data.get('claim_image_url')
    )

    db.session.add(new_claim)
    db.session.commit()

    return new_claim

def verify_claim_service(current_user, object_id, data):
    claim = SubmitClaims.query.filter_by(submit_claim_id=object_id).first()

    if not claim:
        return None, "Claim not found"

    if claim.claim_status != 'verifying':
        return claim.claim_status, "Item already verified"


    admin_id = current_user.user_id
    admin = Users.query.filter_by(user_id=admin_id).first()

    new_verified_claim = VerifiedClaims(
        submit_claim_id=claim.submit_claim_id,
        verified_by=admin.user_id,
        verification_status=data['verification_status'],
        remarks=data['remarks']
    )
    db.session.add(new_verified_claim)
    db.session.commit()

    return new_verified_claim, None

def change_submit_claim_status(claim_id, new_status):
    claim = SubmitClaims.query.filter_by(submit_claim_id=claim_id).first()
    if not claim:
        return None

    claim.claim_status = new_status
    db.session.commit()

    return claim

def is_user_already_submit_claim(user_id, found_object_id):
    existing_claim = SubmitClaims.query.filter_by(
        claim_by=user_id,
        found_object_id=found_object_id
    ).first()
    return existing_claim is not None
