from flask import Blueprint, jsonify
from admin.services import all_users

admin_bp = Blueprint('admin', __name__)
@admin_bp.route('/list', methods=['GET'])
def list_users():
    users_list  = all_users()
    return jsonify(users_list), 200

