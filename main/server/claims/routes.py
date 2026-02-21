from flask import Blueprint, request, jsonify
from claims.services import *
from auth.decorators import auth_required, admin_required

claim_bp = Blueprint('claims', __name__)

@claim_bp.route('/claim-item', methods=['POST'])
def claim_item():
    data = request.get_json()

    if is_user_already_submit_claim(data['student_number'], data['report_id']):
        return jsonify({
            "message": "You have already submitted a claim for this item."
        }), 409


    new_claim = submit_claim_item(data)

    if not new_claim:
        return jsonify({
            "message" : "Item not found"
        }), 404

    # log_user_activity(current_user.user_id, "claim_item", f"Claimed item with claim ID: {new_claim.report_id}")
    
    return jsonify({
        "message": "Item claimed successfully",
        "claim": new_claim.to_json()  
    }), 201


@claim_bp.route('/verify-claim', methods=['POST'])
@auth_required
@admin_required
def verify_claim(current_user):
    data = request.get_json()
    claim_id = data['claim_id']
    status = data['status']

    verification_result, error_message = verify_claim_service(current_user, claim_id, status)

    if error_message:
        return jsonify({
            "message": error_message
        }), 400

    # log_user_activity(current_user.user_id, "verify_claim", f"Verified claim with claim ID: {object_id}")

    return jsonify({
        "message": "Claim verified successfully",
        "verification_result": verification_result.to_json()  
    }), 200