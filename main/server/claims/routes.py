from flask import Blueprint, request, jsonify

claim_bp = Blueprint('claims', __name__)

@claim_bp.route('/create', methods=['POST'])
def create_claim():
    data = request.get_json()
    
    return jsonify({"message": "Claim created successfully"}), 201

