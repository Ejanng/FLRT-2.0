from flask import Blueprint, request, jsonify
from auth.services import register_admin, authenticate_admin
from auth.decorators import auth_required
from core.extensions import redis_client

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/admin-register', methods=['POST'])
def admin_register():
    data = request.get_json()
    new_admin, error = register_admin(data)

    if not new_admin:
        return jsonify({"error": "Admin registration failed"}), 400
    
    # log_user_activity(new_admin.admin_id, "admin_register", "Admin registered successfully")

    return jsonify({
        "message": "Admin registered successfully",
        "admin": {
            "id": new_admin.admin_id,
            "username": new_admin.username,
            "email": new_admin.email
        }
    }), 201

@auth_bp.route('/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    admin, token = authenticate_admin(data['email'], data['password'])

    if not admin:
        return jsonify({"error": token}), 401
    
    # change_user_status(user.user_id, "active")
    # log_user_activity(user.user_id, "login", "User logged in successfully")
    
    return jsonify({
        "access_token": token,
        "admin": {
            "id": admin.admin_id,
            "username": admin.username,
            "role": admin.role,
            "email": admin.email
        }
    }), 200

@auth_bp.route('/admin-logout', methods=['POST'])
@auth_required
def logout(current_user):
    # user, error = change_user_status(current_user.user_id, "deactivated")
    # if error:
    #     return jsonify({
    #         "error": error
    #     }), 400

    # log_user_activity(current_user.user_id, "logout", "User logged out successfully")

    token = request.headers.get("Authorization").replace("Bearer ", "")
    redis_client.sadd("jwt_blacklist", token)
    
    return jsonify({
        "message": "User logged out successfully"
    }), 200