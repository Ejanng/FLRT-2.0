from flask import Blueprint, jsonify
from stats.services import *
from auth.decorators import auth_required, admin_required
from auth.services import log_user_activity

statistics_bp = Blueprint('statistics', __name__)

@statistics_bp.route('/user_statistics', methods=['GET'])
@auth_required
def user_statistics(current_user):
    active_user_count = get_active_user_count()
    registered_user_count = get_registered_user_count()
    total_report_count = get_total_report_count()
    total_claimed_success_count = get_total_claimed_success_count()

    summary = {
        'active_user_count': active_user_count,
        'registered_user_count': registered_user_count,
        'total_report_count': total_report_count,
        'total_claimed_success_count': total_claimed_success_count
    }

    log_user_activity(current_user.user_id, "view_user_statistics", "User viewed user statistics")

    return jsonify(summary), 200


@statistics_bp.route('/admin_statistics', methods=['GET'])
@auth_required
@admin_required
def admin_statistics(current_user):
    active_user_count = get_active_user_count()
    registered_user_count = get_registered_user_count()
    total_report_count = get_total_report_count()
    total_claimed_success_count = get_total_claimed_success_count()
    total_logged_in_count_per_day = get_how_many_user_logged_in_per_day(current_user.user_id)
    total_logged_in_count_per_week = get_how_many_user_logged_in_per_week(current_user.user_id)
    total_logged_in_count_per_month = get_how_many_user_logged_in_per_month(current_user.user_id)
    total_logged_in_count_per_year = get_how_many_user_logged_in_per_year(current_user.user_id)

    summary = {
        'active_user_count': active_user_count,
        'registered_user_count': registered_user_count,
        'total_report_count': total_report_count,
        'total_claimed_success_count': total_claimed_success_count,
        'total_logged_in_count_per_day': total_logged_in_count_per_day,
        'total_logged_in_count_per_week': total_logged_in_count_per_week,
        'total_logged_in_count_per_month': total_logged_in_count_per_month,
        'total_logged_in_count_per_year': total_logged_in_count_per_year
    }

    return jsonify(summary), 200