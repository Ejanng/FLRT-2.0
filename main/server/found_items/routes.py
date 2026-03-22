from flask import Blueprint, request, jsonify
from models.found_items_model import FoundItems
from core.extensions import db
from found_items.services import (
    get_all_found_items, 
    get_pending_found_items, 
    get_found_item_by_id,
    create_found_item,
    contact_finder,
    close_found_item
)
from datetime import datetime, timezone
import os

found_items_bp = Blueprint('found_items', __name__)

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
        if image_file and image_file.filename:
            uploads_dir = '/tmp/found_items'
            os.makedirs(uploads_dir, exist_ok=True)
            filename = f"found_item_{datetime.now().timestamp()}_{image_file.filename}"
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
        
        if not admin_notes:
            return jsonify({"error": "Admin notes are required"}), 400
        
        result = contact_finder(found_item_id, admin_notes)
        if not result:
            return jsonify({"error": "Found item not found"}), 404
        
        return jsonify({
            "message": "Finder contacted successfully",
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
