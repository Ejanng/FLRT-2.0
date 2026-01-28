from flask import Blueprint, request, jsonify
from auth.services import register_user, authenticate_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    user, error = register_user(data)

    if error:
        return jsonify({"error": error}), 400
    
    return jsonify({"message": "User registered successfully", "user_id": user.user_id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user, token = authenticate_user(data['student_number'], data['password'])

    if not user:
        return jsonify({"error": token}), 401
    
    return jsonify({
        "token": token,
        "user": {
            "id": user.user_id,
            "student_number": user.student_number,
            "email": user.email
        }
    }), 200