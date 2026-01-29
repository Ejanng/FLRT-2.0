from models.users_model import Users

def all_users():
    users = Users.query.all()
    users_list = [{"id": user.user_id, "student_number": user.student_number, "email": user.email} for user in users]
    return users_list