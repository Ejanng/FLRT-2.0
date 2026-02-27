from flask import Blueprint, request, jsonify
from sift.services import sift_function

sift_bp = Blueprint('sift', __name__)

