from flask import Blueprint, request, jsonify
from auth.services import register_admin, authenticate_admin
from auth.decorators import auth_required, admin_required
from core.notifications import send_discord_notification
from core.config import Config
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


@auth_bp.route('/test-discord', methods=['POST'])
@auth_required
@admin_required
def test_discord_webhooks(current_user):
    data = request.get_json(silent=True) or {}
    audience = (data.get('audience') or 'both').strip().lower()

    if audience not in ('admin', 'users', 'both'):
        return jsonify({"error": "Invalid audience. Use 'admin', 'users', or 'both'."}), 400

    send_discord_notification(
        title='Discord Webhook Test',
        description='This is a test notification from FLIRT.',
        audience=audience,
        fields=[
            {'name': 'Triggered By', 'value': current_user.username, 'inline': True},
            {'name': 'Audience', 'value': audience, 'inline': True},
        ],
    )

    return jsonify({
        'message': 'Discord test notification attempted.',
        'audience': audience,
        'admin_webhook_configured': bool(Config.DISCORD_ADMIN_WEBHOOK_URL),
        'user_webhook_configured': bool(Config.DISCORD_USER_WEBHOOK_URL),
    }), 200