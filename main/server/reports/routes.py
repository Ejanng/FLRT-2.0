from flask import Blueprint, request, jsonify
from reports.services import submit_report, get_all_reports, process_report_with_image_url
from core.extensions import db

report_bp = Blueprint('reports', __name__)

@report_bp.route('/report-item', methods=['POST'])
def report_item():
    try:
        print(f"Content-Type: {request.content_type}")
        print(f"Form data: {request.form}")
        print(f"Files: {request.files}")
        # Handle FormData (multipart/form-data) instead of JSON

        item_name = request.form.get('item_name')
        description = request.form.get('description')
        status = request.form.get('status')
        location = request.form.get('location')
        date = request.form.get('date')
        time = request.form.get('time')
        
        # Get optional personal info
        student_name = request.form.get('student_name')
        student_number = request.form.get('student_number')
        contact_info = request.form.get('contact_info')
        
        # Handle image file upload
        image_file = request.files.get('image')
        image_url = None
        
        if image_file and image_file.filename:
            # Save temporarily or upload to your storage
            # Option 1: Save to local temp then upload to GDrive
            temp_path = f"/tmp/{image_file.filename}"
            image_file.save(temp_path)
            
            # Upload to Google Drive or your storage
            # image_url = upload_to_gdrive(temp_path)
            # For now, just store the temp path or process with SIFT
            
            # Clean up temp file after upload
            # os.remove(temp_path)
            
            image_url = temp_path  # Replace with actual URL after upload
        
        # Create report data dict
        data = {
            'item_name': item_name,
            'description': description,
            'status': status,
            'location': location,
            'date': date,
            'time': time,
            'image': image_url,
            'student_name': student_name,
            'student_number': student_number,
            'contact_info': contact_info
        }

        # record the report in the database
        new_report = submit_report(data)

        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        image_url = data.get('image')
        status = data.get('status')

        print(image_url, status)
        
        if status not in ['found', 'lost']:
            return jsonify({"error": "Invalid status. Must be 'found' or 'lost'"}), 400

        # If the item is found, we can optionally train the model with the new image
        # uncomment this
        # if status == 'found' and image_url:
        #     train_result = train_model_upon_report(image_url, new_report)
        #     if not train_result.get('success'):
        #         # Log error but don't fail the report submission
        #         print(f"Training failed: {train_result.get('error')}")

        # if the item is lost, we want to process the image to find potential matches in the database
        if status == 'lost' and image_url:
            # print(f"DEBUG: Received image URL for lost item report: {image_url}")
            new_claim, message, process_result = process_report_with_image_url(image_url, data, new_report)
            # if a match is found, we can automatically create a pending claim for the matched report
            if process_result == "Approved":
                return jsonify({
                    "message": message,
                    "report": new_report.to_json(),
                    "new_pending_claim": new_claim.to_json()
                }), 201
            elif process_result == "Incomplete Data":
                return jsonify({
                    "missing_fields": "Missing",        # If statement for frontend to check if missing fields exist and let user to fill in the missing information before proceeding with claim creation
                    "message": message,
                    "report": new_report.to_json()
                }), 201
            else:
                # Return the message even when no match found
                return jsonify({
                    "message": message,
                    "report": new_report.to_json(),
                    "match_result": process_result
                }), 201

        return jsonify({
            "message": "Found item reported successfully",
            "report": new_report.to_json()  
        }), 201 
    
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@report_bp.route('/add_claims', methods=['POST'])
def add_claims():
    data = request.get_json()
    





@report_bp.route('/all-reports', methods=['GET'])
def report_status():
    data = get_all_reports()
    if not data:
        return jsonify({
            "error": "Reports not Found"
        }), 404
    return jsonify(data), 200

