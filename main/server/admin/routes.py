from flask import Blueprint, jsonify
from admin.services import all_users
from auth.decorators import auth_required, admin_required

admin_bp = Blueprint('admin', __name__)

