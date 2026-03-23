from flask import Blueprint, jsonify
<<<<<<< HEAD
from stats.services import get_admin_dashboard_statistics
from auth.decorators import auth_required, admin_required
=======
from models.reports_model import Reports, db
from models.pending_claims_model import PendingClaims
from models.returns_model import Returns
from sqlalchemy import func
>>>>>>> beta-v2.0

stats_bp = Blueprint('stats', __name__)

<<<<<<< HEAD

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
=======
@stats_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get statistics for admin dashboard."""
    try:
        # Total reports
        total_reports = Reports.query.count()
        
        # Pending claims
        pending_claims = PendingClaims.query.filter_by(status='pending').count()
        
        # Resolved/returned items
        resolved = Returns.query.filter_by(status='returned').count()
        
        # Active users (unique claimants)
        active_users = db.session.query(PendingClaims.student_number).distinct().count()
        
        # Reports by status
        lost_reports = Reports.query.filter(Reports.status.like('%lost%')).count()
        found_reports = Reports.query.filter(Reports.status.like('%found%')).count()
        published_reports = Reports.query.filter(Reports.status.startswith('published')).count()
        
        # Recent activity (last 7 days)
        from datetime import datetime, timedelta
        last_week = datetime.utcnow() - timedelta(days=7)
        recent_reports = Reports.query.filter(Reports.date_reported >= last_week).count()
        recent_claims = PendingClaims.query.filter(PendingClaims.date_claimed >= last_week).count()
        
        return jsonify({
            "stats": {
                "total_reports": total_reports,
                "pending_claims": pending_claims,
                "resolved": resolved,
                "active_users": active_users,
                "lost_reports": lost_reports,
                "found_reports": found_reports,
                "published_reports": published_reports,
                "recent_reports": recent_reports,
                "recent_claims": recent_claims
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@stats_bp.route('/reports-by-category', methods=['GET'])
def get_reports_by_category():
    """Get report counts by category."""
    try:
        from sqlalchemy import func
        
        results = db.session.query(
            Reports.category,
            func.count(Reports.report_id)
        ).group_by(Reports.category).all()
        
        return jsonify({
            "categories": [
                {"name": cat or "Uncategorized", "count": count}
                for cat, count in results
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
>>>>>>> beta-v2.0
