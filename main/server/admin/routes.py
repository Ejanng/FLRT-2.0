from flask import Blueprint, jsonify
from admin.services import all_users
from auth.decorators import auth_required, admin_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/list', methods=['GET'])
@auth_required
@admin_required
def list_users(current_user):
    users_list  = all_users()
    return jsonify(users_list), 200

@admin_bp.route('/status', methods=['GET'])
@auth_required
@admin_required
def admin_status(current_user):
    return jsonify({
        "message": "Admin access granted",
        "admin_id": current_user.user_id,
        "admin_role": current_user.role
    }), 200