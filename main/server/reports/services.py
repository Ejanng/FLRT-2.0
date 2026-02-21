from models.reports_model import Reports, db

def submit_report_found(current_user, data):
    print("Submitting found report with data:", data)
    print("Current user data:", current_user.user_id)

    
    new_report = Reports(
              
    )

    db.session.add(new_report)
    db.session.commit()

    return new_report

def get_all_reports():
    all_reports = Reports.query.all()

    return {
        "reports": all_reports
    }