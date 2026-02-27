from models.reports_model import Reports, db

def submit_report(data):
    new_report = Reports(
        item_name=data.get('item_name'),
        description=data.get('description'),
        status=data.get('status'),
        location=data.get('location'),
        time=data.get('time'),
        image=data.get('image')
    )

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



    