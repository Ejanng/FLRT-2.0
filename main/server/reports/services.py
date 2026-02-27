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


def submit_report_found(data, image_name=None):
    print("Submitting found report with data:", data)

    new_report, error = _map_report_payload(data, fallback_status='found', image_name=image_name)
    if error:
        return None, error

    db.session.add(new_report)
    db.session.commit()

    return new_report, None

def submit_report_lost(data, image_name=None):
    print("Submitting lost report with data:", data)

    new_report, error = _map_report_payload(data, fallback_status='lost', image_name=image_name)
    if error:
        return None, error

    db.session.add(new_report)
    db.session.commit()

    return new_report, None

def get_all_reports():
    all_reports = Reports.query.all()

    return {
        "reports": [report.to_json() for report in all_reports]
    }