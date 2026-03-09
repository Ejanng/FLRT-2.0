from flask import Blueprint, jsonify
from stats.services import get_admin_dashboard_statistics
from auth.decorators import auth_required, admin_required

statistics_bp = Blueprint('statistics', __name__)


@statistics_bp.route('/dashboard', methods=['GET'])
def dashboard_statistics():
    return jsonify(get_admin_dashboard_statistics()), 200


@statistics_bp.route('/admin-dashboard', methods=['GET'])
@statistics_bp.route('/admin_statistics', methods=['GET'])
@auth_required
@admin_required
def admin_statistics(current_user):
    _ = current_user
    return jsonify(get_admin_dashboard_statistics()), 200