from flask import Blueprint, request, jsonify
from claims.services import submit_claim_item, is_user_already_submit_claim

claim_bp = Blueprint('claims', __name__)

@claim_bp.route('/claim-item', methods=['POST'])
def claim_item(current_user):
    data = request.get_json()

    if is_user_already_submit_claim(data['username'], data['report_id']):
        return jsonify({
            "message": "You have already submitted a claim for this item."
        }), 409


    new_claim = submit_claim_item(current_user, data)

    if not new_claim:
        return jsonify({
            "message" : "Item not found"
        }), 404

    # log_user_activity(current_user.user_id, "claim_item", f"Claimed item with claim ID: {new_claim.found_object_id}")
    
    return jsonify({
        "message": "Item claimed successfully",
        "claim": new_claim.to_json()  
    }), 201

