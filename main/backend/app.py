from flask import request, jsonify
from config import app, db
from models import Reports, Users, Claimants
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta, timezone
import jwt

bcrypt = Bcrypt(app)

def create_token(user):
    payload = {'user_id': user.user_id, 'exp': datetime.now(timezone.utc) + timedelta(hours=8)}
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return Users.query.get(payload['user_id'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def auth_required(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return {"error": "Authorization token is missing"}, 401
        user = verify_token(token)
        if not user:
            return {"error": "Invalid or expired token"}, 401
        return f(user, *args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if Users.query.filter_by(student_number=data['student_number']).first():
        return jsonify({"error": "Student number already registered"}), 400
    hashed_password = Bcrypt(app).generate_password_hash(data['password']).decode('utf-8')
    new_user = Users(student_number=data['student_number'], 
                     email=data.get('email'), 
                     password_hash=hashed_password,
                     contact_info=data['contact_info'], 
                     registered_on=datetime.now(timezone.utc))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = Users.query.filter_by(student_number=data['student_number']).first()
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        token = create_token(user)
        return jsonify({'token': token, 'user': {'student_number': user.student_number, 'email': user.email}}), 200
    return jsonify({"error": "Invalid student number or password"}), 401

@app.route('/reports', methods=['POST'])
@auth_required
def submit_report(current_user):
    data = request.get_json()
    new_report = Reports(
        object_name=data['object_name'],
        category=data['category'],
        description=data['description'],
        date_reported=datetime.now(timezone.utc),
        last_location=data['last_location'],
        status='reported',
        image_url=data.get('image_url'),
        user_id=current_user.user_id
    )
    db.session.add(new_report)
    db.session.commit()
    return jsonify({"message": "Report submitted successfully", "report_id": new_report.object_id}), 201

@app.route('/claims', methods=['POST'])
@auth_required
def submit_claim(current_user):
    data = request.get_json()
    new_claimant = Claimants(
        contact_info=current_user.contact_info,
        object_id=data['object_id'],
        user_id=current_user.user_id,
    )
    db.session.add(new_claimant)
    db.session.commit()
    return jsonify({"message": "Claimant submitted successfully", "claimant_id": new_claimant.claimant_id}), 201

@app.route('/my-reports', methods=['GET'])
@auth_required
def my_reports(current_user):
    reports = Reports.query.filter_by(user_id=current_user.user_id).all()
    return jsonify([{
        'object_id': r.object_id,
        'object_name': r.object_name,
        'category': r.category,
        'description': r.description,
        'date_reported': r.date_reported.isoformat(),
        'last_location': r.last_location,
        'status': r.status,
        'image_url': r.image_url
    } for r in reports]), 200

@app.route('/my-claims', methods=['GET'])
@auth_required
def my_claims(current_user):
    claims = Claimants.query.filter_by(user_id=current_user.user_id).all()
    return jsonify([{
        'claimant_id': c.claimant_id,
        'object_id': c.object_id,
        'claim_date': c.claim_date.isoformat()
    } for c in claims]), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database tables created.")
    app.run(debug=True)