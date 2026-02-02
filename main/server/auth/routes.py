from flask import Blueprint, request, jsonify
from auth.services import register_user, authenticate_user, change_user_status, log_user_activity
from auth.decorators import auth_required
from core.extensions import redis_client

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
    
    change_user_status(user.user_id, "active")
    log_user_activity(user.user_id, "login", "User logged in successfully")
    
    return jsonify({
        "token": token,
        "user": {
            "id": user.user_id,
            "student_number": user.student_number,
            "role": user.role,
            "email": user.email
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@auth_required
def logout(current_user):
    user, error = change_user_status(current_user.user_id, "deactivated")
    if error:
        return jsonify({
            "error": error
        }), 400

    log_user_activity(current_user.user_id, "logout", "User logged out successfully")

    token = request.headers.get("Authorization").replace("Bearer ", "")
    redis_client.sadd("jwt_blacklist", token)
    
    return jsonify({
        "message": "User logged out successfully"
    }), 200