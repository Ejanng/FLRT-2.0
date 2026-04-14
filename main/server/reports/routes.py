from flask import Blueprint, request, jsonify, send_file
from reports.services import (
    submit_report, 
    get_all_reports, 
    get_claimable_reports,
    publish_report_to_claims,
    delete_report,
    get_report_by_id,
    update_report_status,
    process_report_with_image_url,
    create_pending_claim_for_existing_report,
)
from found_items.services import create_found_item
from sift.services import upload_report_image_by_status
from auth.decorators import auth_required, admin_required
from core.notifications import send_discord_notification
from core.upload_validation import validate_uploaded_image
from werkzeug.utils import secure_filename
import os

report_bp = Blueprint('reports', __name__)


def _send_report_submission_notification(new_report, status, item_name, location, has_image):
    normalized_status = (status or '').strip().lower() or 'unknown'
    send_discord_notification(
        title='New Report Needs Admin Validation',
        description='A new report has been submitted and is waiting for admin review.',
        audience='admin',
        fields=[
            {'name': 'Report ID', 'value': str(new_report.report_id), 'inline': True},
            {'name': 'Status', 'value': normalized_status, 'inline': True},
            {'name': 'Has Image', 'value': 'Yes' if has_image else 'No', 'inline': True},
            {'name': 'Item', 'value': item_name or 'N/A', 'inline': False},
            {'name': 'Location', 'value': location or 'N/A', 'inline': False},
        ],
    )


@report_bp.route('/report-item', methods=['POST'])
def report_item():
    try:
        print(f"Content-Type: {request.content_type}")

        existing_report_id = request.form.get('existing_report_id')
        matched_image_source = request.form.get('matched_image_source')
        existing_report_flow = request.form.get('existing_report_flow') == '1'
        
        # Get form data
        item_name = request.form.get('item_name')
        description = request.form.get('description')
        status_raw = request.form.get('status')
        status = (status_raw or '').strip().lower()
        location = request.form.get('location')
        date = request.form.get('date')
        time = request.form.get('time')
        category = request.form.get('category', 'Uncategorized')
        
        # Get optional personal info
        student_name = request.form.get('student_name')
        student_number = request.form.get('student_number')
        contact_info = request.form.get('contact_info')

        if existing_report_flow and not existing_report_id:
            return jsonify({
                "error": "Missing existing_report_id for matched report completion"
            }), 400

        if existing_report_id:
            print(f"[REPORT FLOW] existing_report_flow detected for report_id={existing_report_id} -> skipping SIFT reprocessing")
            completion_data = {
                'student_name': student_name,
                'student_number': student_number,
                'contact_info': contact_info,
                'description': description,
            }
            claim, error = create_pending_claim_for_existing_report(
                int(existing_report_id),
                completion_data,
                matched_image_source,
            )
            if error:
                return jsonify({"error": error}), 400

            send_discord_notification(
                title='Matched Report Claim Completed',
                description='A user completed personal details for a matched report flow.',
                audience='admin',
                fields=[
                    {'name': 'Report ID', 'value': str(existing_report_id), 'inline': True},
                    {'name': 'Claim ID', 'value': str(claim.claim_id), 'inline': True},
                    {'name': 'Student #', 'value': student_number or 'N/A', 'inline': True},
                ],
            )

            return jsonify({
                "message": "Match found. Pending claim created.",
                "new_pending_claim": claim.to_json(),
            }), 201
        
        # Handle image file upload
        image_file = request.files.get('image')
        image_url = None

        is_valid_image, image_error = validate_uploaded_image(image_file)
        if not is_valid_image:
            return jsonify({"error": image_error}), 400
        
        if image_file and image_file.filename:
            # Save to temp location
            safe_name = secure_filename(image_file.filename)
            temp_path = f"/tmp/{safe_name}"
            image_file.save(temp_path)

            # Upload to Google Drive first (UI data source should use this)
            upload_result = upload_report_image_by_status(
                temp_path,
                status,
                filename_prefix=item_name or 'report_image'
            )
            if upload_result.get('success'):
                image_url = upload_result.get('gdrive_view_link')
            else:
                print(f"GDrive upload failed, using temp path. Error: {upload_result.get('error')}")
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
        new_report = submit_report(data, image_url=image_url)

        _send_report_submission_notification(
            new_report=new_report,
            status=status,
            item_name=item_name,
            location=location,
            has_image=bool(image_url),
        )

        if status == 'found' and all([student_name, student_number, contact_info]):
            try:
                create_found_item(
                    finder_name=student_name,
                    finder_student_number=student_number,
                    finder_contact_info=contact_info,
                    item_name=item_name,
                    item_description=description,
                    item_location=location,
                    category=category,
                    date_found=date,
                    image_path=image_url,
                    report_id=new_report.report_id,
                )
            except Exception as found_item_error:
                print(f"Failed to create linked found item record: {found_item_error}")

        # Process based on status
        if status in ('lost', 'found') and image_url:
            print(f"[REPORT FLOW] new report with status={status} and image present -> running SIFT matching")
            # Process image to find matches
            new_claim, message, process_result, match_result = process_report_with_image_url(
                image_url, data, new_report
            )
            
            if process_result == "Approved":
                return jsonify({
                    "message": message,
                    "report": new_report.to_json(),
                    "new_pending_claim": new_claim.to_json(),
                    "public_matched_image_link": new_claim.image,
                }), 201
            elif process_result == "Incomplete Data":
                return jsonify({
                    "missing_fields": "Missing",
                    "existing_report_id": new_report.report_id,
                    "message": message,
                    "report": new_report.to_json(),
                    "match_result": match_result,
                }), 201
            elif process_result == "Busy":
                return jsonify({
                    "error": message,
                    "report": new_report.to_json(),
                    "match_result": "Busy",
                }), 503
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
    category = data.get('category')
    
    if not report_id:
        return jsonify({"error": "Missing report_id"}), 400
    
    report, error = publish_report_to_claims(report_id, category)
    
    if error:
        return jsonify({"error": error}), 400

    send_discord_notification(
        title='FLIRT Announcement',
        description='A new item has been published and is now open for claims.',
        audience='users',
        fields=[
            {'name': 'Report ID', 'value': str(report.report_id), 'inline': True},
            {'name': 'Status', 'value': report.status, 'inline': True},
            {'name': 'Item', 'value': report.item_name, 'inline': False},
            {'name': 'Location', 'value': report.location or 'N/A', 'inline': False},
        ],
    )

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

    send_discord_notification(
        title='Report Status Updated',
        description='An admin updated a report status during validation/review.',
        audience='admin',
        fields=[
            {'name': 'Report ID', 'value': str(report.report_id), 'inline': True},
            {'name': 'New Status', 'value': report.status or 'N/A', 'inline': True},
            {'name': 'Item', 'value': report.item_name or 'N/A', 'inline': False},
        ],
    )

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

    send_discord_notification(
        title='Report Rejected/Deleted',
        description='A report was removed during admin validation.',
        audience='admin',
        fields=[
            {'name': 'Report ID', 'value': str(report_id), 'inline': True},
            {'name': 'Item', 'value': report.item_name if report else 'N/A', 'inline': False},
        ],
    )

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