from flask import Blueprint, jsonify
from statistics.services import all_users
from auth.decorators import auth_required, admin_required

statistics_bp = Blueprint('statistics', __name__)

@statistics_bp.route('/active_users', methods=['GET'])
@auth_required
def active_users(current_user):
    users_list  = all_users()
    return jsonify(users_list), 200