import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from claims.services import *
from auth.decorators import auth_required, admin_required
from sift.services import process_image

claim_bp = Blueprint('claims', __name__)

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
CLAIM_UPLOADS_DIR = os.path.join(UPLOADS_DIR, 'claims')
os.makedirs(CLAIM_UPLOADS_DIR, exist_ok=True)


@claim_bp.route('/all-claims', methods=['GET'])
@auth_required
@admin_required
def all_claims(current_user):
    data = get_all_claims()
    return jsonify({"claims": data}), 200


@claim_bp.route('/all-claims-public', methods=['GET'])
def all_claims_public():
    data = get_all_claims()
    return jsonify({"claims": data}), 200

@claim_bp.route('/claim-item', methods=['POST'])
def claim_item():
    data = request.get_json(silent=True) or request.form.to_dict()

    if not data:
        return jsonify({
            "message": "Invalid request payload"
        }), 400

    image_file = request.files.get('image')
    sift_result = None
    if image_file and image_file.filename:
        original_name = secure_filename(image_file.filename)
        _, ext = os.path.splitext(original_name)
        generated_name = f"{uuid.uuid4().hex}{ext.lower()}"
        save_path = os.path.join(CLAIM_UPLOADS_DIR, generated_name)

        image_file.save(save_path)
        data['image'] = generated_name

        try:
            sift_result = process_image(save_path)
        except Exception as error:
            sift_result = {
                "success": False,
                "error": f"SIFT processing failed: {str(error)}"
            }

    required_fields = ['student_name', 'student_number', 'contact_info', 'description', 'report_id']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({
            "message": f"Missing required fields: {', '.join(missing_fields)}"
        }), 400

    try:
        data['report_id'] = int(data['report_id'])
    except (TypeError, ValueError):
        return jsonify({
            "message": "report_id must be a valid number"
        }), 400

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
    
    response_payload = {
        "message": "Item claimed successfully",
        "claim": new_claim.to_json()  
    }

    if sift_result is not None:
        response_payload["sift_result"] = sift_result

    return jsonify(response_payload), 201


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