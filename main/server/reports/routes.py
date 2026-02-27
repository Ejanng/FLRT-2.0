import os
from uuid import uuid4
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, send_from_directory
from reports.services import (
    submit_report_found,
    submit_report_lost,
    get_all_reports,
    publish_report_to_claims,
    get_claimable_reports,
)

reports_bp = Blueprint('reports', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _extract_request_data():
    if request.is_json:
        return request.get_json() or {}
    return request.form.to_dict() if request.form else {}


def _save_photo_file():
    photo = request.files.get('photo')
    if not photo or not photo.filename:
        return None

    original_name = secure_filename(photo.filename)
    if not original_name:
        return None

    unique_name = f"{uuid4().hex}_{original_name}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    photo.save(save_path)
    return unique_name


def _create_report_from_payload(data):
    status = (data.get('status') or '').strip().lower()
    image_name = _save_photo_file()

    if status == 'lost':
        return submit_report_lost(data, image_name=image_name)
    return submit_report_found(data, image_name=image_name)

@reports_bp.route('/report-found', methods=['POST'])
def report_found_item():
    data = _extract_request_data()
    new_report, error = submit_report_found(data, image_name=_save_photo_file())

    if error:
        return jsonify({"error": error}), 400

    # log_user_activity(current_user.user_id, "report_found", f"Reported found item: {new_report.found_object_name}")

    return jsonify({
        "message": "Found item reported successfully",
        "report": new_report.to_json()  
    }), 201


@reports_bp.route('/report-lost', methods=['POST'])
def report_lost_item():
    data = _extract_request_data()
    new_report, error = submit_report_lost(data, image_name=_save_photo_file())

    if error:
        return jsonify({"error": error}), 400

    # log_user_activity(current_user.user_id, "report_lost", f"Reported lost item: {new_report.lost_object_name}")

    return jsonify({
        "message": "Lost item reported successfully",
        "report": new_report.to_json()  
    }), 201


@reports_bp.route('/reports', methods=['POST'])
def submit_report():
    data = _extract_request_data()
    new_report, error = _create_report_from_payload(data)

    if error:
        return jsonify({"error": error}), 400

    return jsonify({
        "message": "Report submitted successfully",
        "report": new_report.to_json()
    }), 201


@reports_bp.route('/all-reports', methods=['GET'])
def report_status():
    data = get_all_reports()
    if not data:
        return jsonify({
            "error": "Reports not Found"
        }), 404
    return jsonify(data), 200


@reports_bp.route('/publish-report', methods=['POST'])
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


@reports_bp.route('/claimable-reports', methods=['GET'])
def claimable_reports():
    data = get_claimable_reports()
    return jsonify(data), 200


@reports_bp.route('/uploads/<path:filename>', methods=['GET'])
def get_uploaded_report_image(filename):
    return send_from_directory(UPLOAD_DIR, filename)