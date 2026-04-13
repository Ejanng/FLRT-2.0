from flask import Blueprint, request, jsonify
from sift.services import train_model, process_image, retrain_model_for_status, get_drive_health_status
from core.config import Config
from core.notifications import test_discord_webhooks
from auth.decorators import auth_required, admin_required

sift_bp = Blueprint('sift', __name__)

@sift_bp.route('/train', methods=['POST'])
def train_model_route():
    gdrive_url = Config.GDRIVE_URL
    if not gdrive_url:
        return jsonify({"error": "Missing 'gdrive_url' in request body."}), 400
    
    result = train_model(gdrive_url)
    return jsonify({
        "message": "Trained model successfully",
        "result": result
    }), 201


@sift_bp.route('/process', methods=['POST'])
def process_image_route():
    data = request.get_json()
    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"error": "Missing 'image_url' in request body."}), 400
    
    result = process_image(image_url)
    return jsonify(result)


@sift_bp.route('/admin/retrain', methods=['POST'])
@auth_required
@admin_required
def retrain_status_dataset(current_user):
    data = request.get_json() or {}
    status = (data.get('status') or '').strip().lower()

    if status not in ('lost', 'found'):
        return jsonify({"error": "status must be either 'lost' or 'found'"}), 400

    result = retrain_model_for_status(status)
    if not result.get('success'):
        return jsonify(result), 500

    return jsonify({
        "message": f"Retrained {status} dataset successfully",
        "result": result
    }), 200


@sift_bp.route('/admin/test-webhooks', methods=['POST'])
@auth_required
@admin_required
def test_webhooks(current_user):
    results = test_discord_webhooks()
    admin_success = results.get('admin', {}).get('success', False)
    users_success = results.get('users', {}).get('success', False)

    status_code = 200 if admin_success and users_success else 207
    return jsonify({
        'message': 'Discord webhook test completed',
        'results': results,
    }), status_code


@sift_bp.route('/admin/drive-health', methods=['GET'])
@auth_required
@admin_required
def drive_health(current_user):
    result = get_drive_health_status()
    status_code = 200 if result.get('success') else 503
    return jsonify(result), status_code

