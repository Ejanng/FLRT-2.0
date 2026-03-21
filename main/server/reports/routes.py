from flask import Blueprint, request, jsonify, send_file
from reports.services import (
    submit_report, 
    get_all_reports, 
    get_claimable_reports,
    publish_report_to_claims,
    delete_report,
    get_report_by_id,
    update_report_status,
    process_report_with_image_url
)
from auth.decorators import auth_required, admin_required
import os

report_bp = Blueprint('reports', __name__)

@report_bp.route('/report-item', methods=['POST'])
def report_item():
    try:
        print(f"Content-Type: {request.content_type}")
        
        # Get form data
        item_name = request.form.get('item_name')
        description = request.form.get('description')
        status = request.form.get('status')
        location = request.form.get('location')
        date = request.form.get('date')
        time = request.form.get('time')
        category = request.form.get('category', 'Uncategorized')
        
        # Get optional personal info
        student_name = request.form.get('student_name')
        student_number = request.form.get('student_number')
        contact_info = request.form.get('contact_info')
        
        # Handle image file upload
        image_file = request.files.get('image')
        image_url = None
        
        if image_file and image_file.filename:
            # Save to temp location
            temp_path = f"/tmp/{image_file.filename}"
            image_file.save(temp_path)
            image_url = temp_path
        
        # Create report data dict
        data = {
            'item_name': item_name,
            'description': description,
            'status': status,
            'location': location,
            'date': date,
            'time': time,
            'category': category,
            'image': image_url,
            'student_name': student_name,
            'student_number': student_number,
            'contact_info': contact_info
        }

        # Validate required fields
        if not all([item_name, description, status, location, date]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Create the report
        new_report = submit_report(data)

        # Process based on status
        if status == 'lost' and image_url:
            # Process image to find matches
            new_claim, message, process_result = process_report_with_image_url(
                image_url, data, new_report
            )
            
            if process_result == "Approved":
                return jsonify({
                    "message": message,
                    "report": new_report.to_json(),
                    "new_pending_claim": new_claim.to_json()
                }), 201
            elif process_result == "Incomplete Data":
                return jsonify({
                    "missing_fields": "Missing",
                    "message": message,
                    "report": new_report.to_json()
                }), 201
            else:
                return jsonify({
                    "message": message,
                    "report": new_report.to_json(),
                    "match_result": process_result
                }), 201

        return jsonify({
            "message": "Report submitted successfully",
            "report": new_report.to_json()  
        }), 201 
    
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@report_bp.route('/all-reports', methods=['GET'])
# @auth_required  # Uncomment to require auth
# @admin_required  # Uncomment to require admin
def report_status():
    """Get all reports for admin dashboard."""
    data = get_all_reports()
    return jsonify(data), 200


@report_bp.route('/claimable-reports', methods=['GET'])
def claimable_reports():
    """Get published reports for public claim page."""
    data = get_claimable_reports()
    return jsonify(data), 200


@report_bp.route('/report/<int:report_id>', methods=['GET'])
def get_report(report_id):
    """Get single report by ID."""
    report = get_report_by_id(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    return jsonify({"report": report}), 200


@report_bp.route('/publish-report', methods=['POST'])
# @auth_required  # Uncomment to require auth
# @admin_required  # Uncomment to require admin
def publish_report():
    """Publish a report to make it visible in claim page."""
    data = request.get_json()
    report_id = data.get('report_id')
    
    if not report_id:
        return jsonify({"error": "Missing report_id"}), 400
    
    report, error = publish_report_to_claims(report_id)
    
    if error:
        return jsonify({"error": error}), 400
    
    return jsonify({
        "message": "Report published successfully",
        "report": report.to_json()
    }), 200


@report_bp.route('/update-report/<int:report_id>', methods=['PUT'])
def update_report(report_id):
    """Update report status."""
    data = request.get_json()
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({"error": "Missing status"}), 400
    
    report, error = update_report_status(report_id, new_status)
    
    if error:
        return jsonify({"error": error}), 404
    
    return jsonify({
        "message": "Report updated successfully",
        "report": report.to_json()
    }), 200


@report_bp.route('/delete-report/<int:report_id>', methods=['DELETE'])
# @auth_required  # Uncomment to require auth
# @admin_required  # Uncomment to require admin
def delete_report_route(report_id):
    """Delete a report (admin rejection)."""
    report, error = delete_report(report_id)
    
    if error:
        return jsonify({"error": error}), 404
    
    return jsonify({
        "message": "Report deleted successfully",
        "report_id": report_id
    }), 200


@report_bp.route('/images/<path:image_path>', methods=['GET'])
def get_image(image_path):
    """Serve report images."""
    try:
        # Security: prevent directory traversal
        safe_path = os.path.normpath(image_path)
        if '..' in safe_path or safe_path.startswith('/'):
            return jsonify({"error": "Invalid path"}), 400
        
        # Check multiple possible locations
        possible_paths = [
            os.path.join('/tmp', safe_path),
            os.path.join('/tmp', os.path.basename(safe_path)),
            safe_path if os.path.exists(safe_path) else None
        ]
        
        full_path = None
        for path in possible_paths:
            if path and os.path.exists(path):
                full_path = path
                break
        
        if not full_path:
            return jsonify({"error": "Image not found"}), 404
        
        # Determine mimetype
        mimetype = 'image/jpeg'
        if full_path.endswith('.png'):
            mimetype = 'image/png'
        elif full_path.endswith('.gif'):
            mimetype = 'image/gif'
        
        return send_file(full_path, mimetype=mimetype)
    except Exception as e:
        return jsonify({"error": str(e)}), 500