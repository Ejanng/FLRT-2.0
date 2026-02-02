from models.users_model import Users, db
from models.user_logs_model import UserLog
from datetime import datetime, timezone
from flask_bcrypt import Bcrypt
from auth.token import create_access_token

bcrypt = Bcrypt()
roles = "admin"          # user - default, admin, superadmin

def register_user(data):
    if Users.query.filter_by(student_number=data['student_number']).first():
        return None, "Student number already registered"
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

    new_user = Users(
        student_number=data['student_number'],
        email=data.get('email'),
        password_hash=hashed_password,
        role=roles,
        contact_info=data['contact_info']
    )
    db.session.add(new_user)
    db.session.commit()

    return new_user, None

def authenticate_user(student_number, password):
    user = Users.query.filter_by(student_number=student_number).first()
    if not user:
        return None, "Invalid student number or password"
    
    if not bcrypt.check_password_hash(user.password_hash, password):
        return None, "Invalid student number or password"
    
    token = create_access_token(user.user_id, user.role)
    return user, token

def change_user_status(user_id, new_status):
    user = Users.query.get(user_id)
    if not user:
        return None, "User not found"
    
    user.status = new_status
    db.session.commit()
    return user, None

def log_user_activity(user_id, action, details):
    log_entry = UserLog(
        user_id=user_id,
        action=action,
        details=details
    )
    db.session.add(log_entry)
    db.session.commit()
    return log_entry