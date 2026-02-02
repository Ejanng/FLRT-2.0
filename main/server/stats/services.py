from models import *
from datetime import datetime, timedelta

def get_active_user_count():
    return Users.query.filter_by(status='active').count()

def get_registered_user_count():
    return Users.query.count()

def get_total_report_count():
    return Reports.query.count()

def get_total_claimed_success_count():
    return SuccessClaimed.query.count()

def get_how_many_user_logged_in_per_day(user_id):
    one_day_ago = datetime.now() - timedelta(days=1)
    return UserLog.query.filter(
        UserLog.user_id == user_id,
        UserLog.last_seen >= one_day_ago
    ).count()

def get_how_many_user_logged_in_per_week(user_id):
    one_week_ago = datetime.now() - timedelta(weeks=1)
    return UserLog.query.filter(
        UserLog.user_id == user_id,
        UserLog.last_seen >= one_week_ago
    ).count()

def get_how_many_user_logged_in_per_month(user_id):
    one_month_ago = datetime.now() - timedelta(days=30)
    return UserLog.query.filter(
        UserLog.user_id == user_id,
        UserLog.last_seen >= one_month_ago
    ).count()

def get_how_many_user_logged_in_per_year(user_id):
    one_year_ago = datetime.now() - timedelta(days=365)
    return UserLog.query.filter(
        UserLog.user_id == user_id,
        UserLog.last_seen >= one_year_ago
    ).count()
