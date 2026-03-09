from models.pending_claims_model import PendingClaims
from models.reports_model import Reports


def get_total_report_count() -> int:
    return Reports.query.count()


def get_pending_claim_count() -> int:
    return PendingClaims.query.filter_by(status='pending').count()


def get_resolved_claim_count() -> int:
    return PendingClaims.query.filter(PendingClaims.status.in_(['verified', 'rejected'])).count()


def get_admin_dashboard_statistics() -> dict[str, int]:
    return {
        'total_reports': get_total_report_count(),
        'pending_claims': get_pending_claim_count(),
        'resolved_claims': get_resolved_claim_count(),
    }
