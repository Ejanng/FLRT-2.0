from flask import Blueprint, request, jsonify
from claims.services import submit_claim_item, verify_claim_service, change_submit_claim_status, is_user_already_submit_claim
from auth.decorators import auth_required, admin_required
from auth.services import log_user_activity

claim_bp = Blueprint('claims', __name__)

@claim_bp.route('/claim-item', methods=['POST'])
@auth_required
def claim_item(current_user):
    data = request.get_json()

    if is_user_already_submit_claim(current_user.user_id, data['found_object_id']):
        return jsonify({
            "message": "You have already submitted a claim for this item."
        }), 409

    new_claim = submit_claim_item(current_user, data)

    if not new_claim:
        return jsonify({
            "message" : "Item not found"
        }), 404

    log_user_activity(current_user.user_id, "claim_item", f"Claimed item with claim ID: {new_claim.found_object_id}")
    
    return jsonify({
        "message": "Item claimed successfully",
        "claim": new_claim.to_json()  
    }), 201


@claim_bp.route('/verify-claim/<int:object_id>', methods=['POST'])
@auth_required
@admin_required
def verify_claim(current_user, object_id):
    data = request.get_json() or {}
    verified_claim, error = verify_claim_service(current_user, object_id, data)

    if verified_claim != 'verifying' and verified_claim is not None:
        return jsonify({
            "message": error
        }), 208
    
    if not verified_claim:
        return jsonify({
            "message": error
        }), 404
    
    new_status = change_submit_claim_status(verified_claim.submit_claim_id, verified_claim.verification_status)

    log_user_activity(current_user.user_id, "verify_claim", f"Verified claim with ID: {verified_claim.verified_claim_id}")

    message = (
        "Claim approved successfully"
        if verified_claim.verification_status == "approved"
        else "Claim rejected successfully"
    )

    return jsonify({
        "message": message,
        "error": error,
        "verified_claim": verified_claim.to_json(),
        "new_status": new_status.to_json()
        
    }), 200
    