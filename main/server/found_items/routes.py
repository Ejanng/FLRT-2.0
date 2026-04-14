from flask import Blueprint, request, jsonify
from models.found_items_model import FoundItems
from core.extensions import db
from found_items.services import (
    get_all_found_items, 
    get_pending_found_items, 
    get_found_item_by_id,
    create_found_item,
    contact_finder,
    close_found_item,
    contact_finder_by_report,
    verify_found_item_by_report
)
from auth.token import decode_access_token
from datetime import datetime, timezone
from core.upload_validation import validate_uploaded_image
from core.notifications import send_discord_notification
from werkzeug.utils import secure_filename
import os

found_items_bp = Blueprint('found_items', __name__)


def _extract_admin_id(request_data=None):
    data = request_data or {}
    admin_id = data.get('admin_id')
    if admin_id is not None:
        try:
            return int(admin_id)
        except (TypeError, ValueError):
            return None

    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        payload = decode_access_token(token)
        if payload:
            subject = payload.get('sub')
            try:
                return int(subject) if subject is not None else None
            except (TypeError, ValueError):
                return None
    return None

@found_items_bp.route('/submit', methods=['POST', 'OPTIONS'])
def submit_found_item():
    """Submit a found item for admin coordination."""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Handle FormData
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form
            image_file = request.files.get('image')
        else:
            data = request.get_json() or {}
            image_file = None
        
        # Extract fields
        finder_name = data.get('finder_name')
        finder_student_number = data.get('finder_student_number')
        finder_contact_info = data.get('finder_contact_info')
        item_name = data.get('item_name')
        item_description = data.get('item_description')
        item_location = data.get('item_location')
        category = data.get('category')
        date_found = data.get('date_found')
        
        # Validate required fields
        required_fields = [
            'finder_name', 'finder_student_number', 'finder_contact_info',
            'item_name', 'item_description', 'item_location', 'date_found'
        ]
        
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
        
        # Handle image upload
        image_path = None
        is_valid_image, image_error = validate_uploaded_image(image_file)
        if not is_valid_image:
            return jsonify({"error": image_error}), 400

        if image_file and image_file.filename:
            uploads_dir = '/tmp/found_items'
            os.makedirs(uploads_dir, exist_ok=True)
            safe_name = secure_filename(image_file.filename)
            filename = f"found_item_{datetime.now().timestamp()}_{safe_name}"
            image_path = os.path.join(uploads_dir, filename)
            image_file.save(image_path)
        
        # Create found item
        result = create_found_item(
            finder_name=finder_name,
            finder_student_number=finder_student_number,
            finder_contact_info=finder_contact_info,
            item_name=item_name,
            item_description=item_description,
            item_location=item_location,
            category=category,
            date_found=date_found,
            image_path=image_path
        )
        
        send_discord_notification(
            title='New Found Item Submission',
            description='A found item was submitted and is waiting for admin coordination.',
            audience='admin',
            fields=[
                {'name': 'Found Item ID', 'value': str(result.get('found_item_id') or 'N/A'), 'inline': True},
                {'name': 'Report ID', 'value': str(result.get('report_id') or 'N/A'), 'inline': True},
                {'name': 'Finder', 'value': result.get('finder_name') or 'N/A', 'inline': False},
                {'name': 'Item', 'value': result.get('item_name') or 'N/A', 'inline': False},
            ],
        )

        return jsonify({
            "message": "Found item submitted successfully",
            "found_item": result
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/all', methods=['GET'])
def get_all():
    """Get all found items."""
    try:
        items = get_all_found_items()
        return jsonify({"found_items": items}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/pending', methods=['GET'])
def get_pending():
    """Get all pending found items."""
    try:
        items = get_pending_found_items()
        return jsonify({"found_items": items}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/<int:found_item_id>', methods=['GET'])
def get_by_id(found_item_id):
    """Get a specific found item."""
    try:
        item = get_found_item_by_id(found_item_id)
        if not item:
            return jsonify({"error": "Found item not found"}), 404
        return jsonify(item), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/<int:found_item_id>/contact', methods=['POST'])
def contact_found_item(found_item_id):
    """Mark found item as contacted and store admin notes."""
    try:
        data = request.get_json() or {}
        admin_notes = data.get('admin_notes')
        admin_id = _extract_admin_id(data)
        
        if not admin_notes:
            return jsonify({"error": "Admin notes are required"}), 400
        
        result = contact_finder(found_item_id, admin_notes, admin_id)
        if not result:
            return jsonify({"error": "Found item not found"}), 404

        send_discord_notification(
            title='Finder Contacted',
            description='Admin contacted a finder as part of found-item validation.',
            audience='admin',
            fields=[
                {'name': 'Found Item ID', 'value': str(result.get('found_item_id') or found_item_id), 'inline': True},
                {'name': 'Admin ID', 'value': str(admin_id or 'N/A'), 'inline': True},
                {'name': 'Status', 'value': result.get('status') or 'contacted', 'inline': True},
            ],
        )

        return jsonify({
            "message": "Finder contacted successfully",
            "found_item": result
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/report/<int:report_id>/contact', methods=['POST'])
def contact_found_item_by_report(report_id):
    """Contact finder for a found report by report ID."""
    try:
        data = request.get_json() or {}
        admin_notes = data.get('admin_notes')
        admin_id = _extract_admin_id(data)

        if not admin_notes:
            return jsonify({"error": "Admin notes are required"}), 400

        result = contact_finder_by_report(report_id, admin_notes, admin_id)
        if not result:
            return jsonify({"error": "Found report coordination record not found"}), 404

        send_discord_notification(
            title='Found Report Coordination Started',
            description='Admin contacted finder for a found report and started coordination.',
            audience='admin',
            fields=[
                {'name': 'Report ID', 'value': str(report_id), 'inline': True},
                {'name': 'Admin ID', 'value': str(admin_id or 'N/A'), 'inline': True},
                {'name': 'Status', 'value': result.get('status') or 'contacted', 'inline': True},
            ],
        )

        return jsonify({
            "message": "Finder contacted successfully",
            "found_item": result
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/report/<int:report_id>/verify', methods=['POST'])
def verify_found_item_report(report_id):
    """Mark found report coordination as verified by report ID."""
    try:
        data = request.get_json() or {}
        admin_notes = data.get('admin_notes')
        admin_id = _extract_admin_id(data)

        result = verify_found_item_by_report(report_id, admin_notes, admin_id)
        if not result:
            return jsonify({"error": "Found report coordination record not found"}), 404

        send_discord_notification(
            title='Found Report Verified',
            description='Admin verification for a found report was completed.',
            audience='admin',
            fields=[
                {'name': 'Report ID', 'value': str(report_id), 'inline': True},
                {'name': 'Found Item ID', 'value': str(result.get('found_item_id') or 'N/A'), 'inline': True},
                {'name': 'Admin ID', 'value': str(admin_id or 'N/A'), 'inline': True},
                {'name': 'Status', 'value': result.get('status') or 'verified', 'inline': True},
            ],
        )

        return jsonify({
            "message": "Found report coordination verified",
            "found_item": result
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/<int:found_item_id>/close', methods=['POST'])
def close_item(found_item_id):
    """Close a found item (mark as returned or cancelled)."""
    try:
        data = request.get_json() or {}
        status = data.get('status')
        
        if status not in ['returned', 'cancelled']:
            return jsonify({"error": "Status must be 'returned' or 'cancelled'"}), 400
        
        result = close_found_item(found_item_id, status)
        if not result:
            return jsonify({"error": "Found item not found"}), 404
        
        send_discord_notification(
            title='Found Item Closed',
            description='A found item workflow was closed by admin.',
            audience='admin' if status == 'cancelled' else 'both',
            fields=[
                {'name': 'Found Item ID', 'value': str(result.get('found_item_id') or found_item_id), 'inline': True},
                {'name': 'Status', 'value': status, 'inline': True},
                {'name': 'Item', 'value': result.get('item_name') or 'N/A', 'inline': False},
            ],
        )

        return jsonify({
            "message": f"Found item marked as {status}",
            "found_item": result
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@found_items_bp.route('/images/<path:filename>', methods=['GET'])
def get_image(filename):
    """Serve uploaded found item images."""
    try:
        file_path = f'/tmp/found_items/{filename}'
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                return f.read(), 200, {'Content-Type': 'image/jpeg'}
        return jsonify({"error": "Image not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
