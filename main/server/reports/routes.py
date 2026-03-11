from flask import Blueprint, request, jsonify
from reports.services import submit_report, get_all_reports, process_report_with_image_url
from core.extensions import db

report_bp = Blueprint('reports', __name__)

@report_bp.route('/report-item', methods=['POST'])
def report_item():
    data = request.get_json()

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
        print(f"DEBUG: Received image URL for lost item report: {image_url}")
        new_claim, message, process_result = process_report_with_image_url(image_url, data, new_report)
        # if a match is found, we can automatically create a pending claim for the matched report
        if process_result == "Approved":
            return jsonify({
                "message": message,
                "report": new_report.to_json(),
                "new_pending_claim": new_claim.to_json()
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



@report_bp.route('/all-reports', methods=['GET'])
def report_status():
    data = get_all_reports()
    if not data:
        return jsonify({
            "error": "Reports not Found"
        }), 404
    return jsonify(data), 200


# chjrym - pushed

# @report_bp.route('/publish-report', methods=['POST'])
# def publish_report():
#     payload = request.get_json() or {}
#     report_id = payload.get('report_id')

#     if not report_id:
#         return jsonify({"error": "report_id is required"}), 400

#     try:
#         report_id = int(report_id)
#     except (TypeError, ValueError):
#         return jsonify({"error": "report_id must be a valid number"}), 400

#     published_report, error = publish_report_to_claims(report_id)

#     if error:
#         return jsonify({"error": error}), 400

#     return jsonify({
#         "message": "Report published to claims successfully",
#         "report": published_report.to_json()
#     }), 200


# @report_bp.route('/claimable-reports', methods=['GET'])
# def claimable_reports():
#     data = get_claimable_reports()
#     return jsonify(data), 200


# Unknown FUNCTION FIX LATER

# @report_bp.route('/uploads/<path:filename>', methods=['GET'])
# def get_uploaded_report_image(filename):
#     return send_from_directory(UPLOAD_DIR, filename)