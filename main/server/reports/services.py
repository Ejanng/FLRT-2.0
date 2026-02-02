from models.found_reports_model import FoundReports, db
from models.users_model import Users

def submit_report_found(current_user, data):
    print("Submitting found report with data:", data)
    print("Current user data:", current_user.user_id)
    user_id = current_user.user_id
    users = Users.query.filter_by(user_id=user_id).first()
    
    new_report = FoundReports(
        found_object_name=data['found_object_name'],
        found_by=users.student_number,
        found_description=data['found_description'],
        found_last_location_seen=data['found_last_location_seen'],
        found_image_url=data['found_image_url']        
    )

    db.session.add(new_report)
    db.session.commit()

    return new_report