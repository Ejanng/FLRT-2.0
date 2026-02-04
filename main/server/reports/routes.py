from flask import Blueprint, request, jsonify
from auth.decorators import auth_required
from auth.services import log_user_activity
from reports.services import submit_report_found, submit_report_lost

report_bp = Blueprint('reports', __name__)

@report_bp.route('/report-found-item', methods=['POST'])
@auth_required
def report_found_item(current_user):
    data = request.get_json()
    new_report = submit_report_found(current_user, data)

    log_user_activity(current_user.user_id, "report_found", f"Reported found item: {new_report.found_object_name}")

    return jsonify({
        "message": "Found item reported successfully",
        "report": new_report.to_json()  
    }), 201

@report_bp.route('/report-lost-item', methods=['POST'])
@auth_required
def report_lost_item(current_user):
    data = request.get_json()
    new_report = submit_report_lost(current_user, data)

    log_user_activity(current_user.user_id, "report_lost", f"Reported lost item: {new_report.lost_object_name}")

    return jsonify({
        "message": "Lost item reported successfully",
        "report": new_report.to_json()  
    }), 201