from models.users_model import Users, db
from flask import Blueprint, request, jsonify

list_users_bp = Blueprint('list_users', __name__)
@list_users_bp.route('/list', methods=['GET'])
def list_users():
    users = Users.query.all()
    users_list = [{"id": user.user_id, "student_number": user.student_number, "email": user.email} for user in users]
    print(users_list)
    return jsonify(users_list), 200
