from models.reports_model import Reports, db
from datetime import datetime

def submit_report(data):
    required_fields = ['item_name', 'status', 'location']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return None, f"Missing required fields: {', '.join(missing_fields)}"

    reported_date = None
    raw_date = data.get('date_reported')
    if raw_date:
        try:
            reported_date = datetime.strptime(str(raw_date), '%Y-%m-%d')
        except (TypeError, ValueError):
            return None, "date_reported must be in YYYY-MM-DD format"

    new_report = Reports(
        item_name=data.get('item_name'),
        description=data.get('description'),
        status=data.get('status'),
        location=data.get('location'),
        date_reported=reported_date,
        image=data.get('image')
    )

    db.session.add(new_report)
    db.session.commit()

    return new_report, None

def get_all_reports():
    all_reports = Reports.query.all()

    return {
        "reports": [report.to_json() for report in all_reports]
    }


def publish_report_to_claims(report_id):
    report = Reports.query.filter_by(report_id=report_id).first()

    if not report:
        return None, "Report not found"

    if report.status in ('published', 'published_lost', 'published_found'):
        return report, None

    current_status = (report.status or '').strip().lower()
    if current_status == 'lost':
        report.status = 'published_lost'
    elif current_status == 'found':
        report.status = 'published_found'
    else:
        report.status = 'published_found'

    db.session.commit()

    return report, None


def get_claimable_reports():
    claimable_reports = Reports.query.filter(
        Reports.status.in_(['published', 'published_lost', 'published_found'])
    ).all()

    mapped_reports = []
    for report in claimable_reports:
        payload = report.to_json()
        status = (report.status or '').strip().lower()
        if status == 'published_lost':
            payload['status'] = 'lost'
        else:
            payload['status'] = 'found'
        mapped_reports.append(payload)

    return {
        "reports": mapped_reports
    }



    