from models.reports_model import Reports

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