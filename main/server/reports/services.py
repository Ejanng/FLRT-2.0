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

    db.session.add(new_report)
    db.session.commit()

    return new_report

def get_all_reports():
    all_reports = Reports.query.all()

    return {
        "reports": [report.to_json() for report in all_reports]
    }