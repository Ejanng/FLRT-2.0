from flask import Blueprint, request, jsonify
from auth.decorators import auth_required
from auth.services import log_user_activity
from reports.services import submit_report_found

report_bp = Blueprint('reports', __name__)

@report_bp.route('/report-item', methods=['POST'])
@auth_required
def report_found_item(current_user):
    data = request.get_json()
    print(current_user.student_number)
    new_report = submit_report_found(current_user, data)

    log_user_activity(current_user.user_id, "report_found", f"Reported found item: {new_report.found_object_name}")

    return jsonify({
        "message": "Found item reported successfully",
        "report": new_report.to_json()  
    }), 201
