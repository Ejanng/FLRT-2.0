from flask import Blueprint, request, jsonify
from server.reports.services import submit_report, get_all_reports, publish_report_to_claims, get_claimable_reports

report_bp = Blueprint('reports', __name__)

@report_bp.route('/report-item', methods=['POST'])
def report_item():
    data = request.get_json()
    new_report = submit_report(data)

    # log_user_activity(current_user.user_id, "report_found", f"Reported found item: {new_report.found_object_name}")

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

@report_bp.route('/publish-report', methods=['POST'])
def publish_report():
    payload = request.get_json() or {}
    report_id = payload.get('report_id')

    if not report_id:
        return jsonify({"error": "report_id is required"}), 400

    try:
        report_id = int(report_id)
    except (TypeError, ValueError):
        return jsonify({"error": "report_id must be a valid number"}), 400

    published_report, error = publish_report_to_claims(report_id)

    if error:
        return jsonify({"error": error}), 400

    return jsonify({
        "message": "Report published to claims successfully",
        "report": published_report.to_json()
    }), 200


@report_bp.route('/claimable-reports', methods=['GET'])
def claimable_reports():
    data = get_claimable_reports()
    return jsonify(data), 200


# Unknown FUNCTION FIX LATER

# @report_bp.route('/uploads/<path:filename>', methods=['GET'])
# def get_uploaded_report_image(filename):
#     return send_from_directory(UPLOAD_DIR, filename)