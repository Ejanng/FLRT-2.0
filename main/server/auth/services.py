from models.users_model import Users, db
from flask_bcrypt import Bcrypt
from auth.token import create_access_token

bcrypt = Bcrypt()

def register_user(data):
    if Users.query.filter_by(student_number=data['student_number']).first():
        return None, "Student number already registered"
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

    new_user = Users(
        student_number=data['student_number'],
        email=data.get('email'),
        password_hash=hashed_password,
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
    
    token = create_access_token(user.user_id)
    return user, token