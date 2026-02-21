from flask import Blueprint, request, jsonify
from reports.services import submit_report_found, submit_report_lost, get_all_reports

report_bp = Blueprint('reports', __name__)

@report_bp.route('/report-found', methods=['POST'])
def report_found_item(current_user):
    data = request.get_json()
    new_report = submit_report_found(current_user, data)

    # log_user_activity(current_user.user_id, "report_found", f"Reported found item: {new_report.found_object_name}")

    return jsonify({
        "message": "Found item reported successfully",
        "report": new_report.to_json()  
    }), 201


@report_bp.route('/report-lost', methods=['POST'])
def report_lost_item(current_user):
    data = request.get_json()
    new_report = submit_report_lost(current_user, data)

    # log_user_activity(current_user.user_id, "report_lost", f"Reported lost item: {new_report.lost_object_name}")

    return jsonify({
        "message": "Lost item reported successfully",
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