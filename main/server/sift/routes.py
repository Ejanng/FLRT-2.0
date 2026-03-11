from flask import Blueprint, request, jsonify
from sift.services import train_model, process_image
from core.config import Config

sift_bp = Blueprint('sift', __name__)

@sift_bp.route('/train', methods=['POST'])
def train_model_route():
    gdrive_url = Config.GDRIVE_URL
    if not gdrive_url:
        return jsonify({"error": "Missing 'gdrive_url' in request body."}), 400
    
    result = train_model(gdrive_url)
    return jsonify({
        "message": "Trained model successfully",
        "result": result
    }), 201


@sift_bp.route('/process', methods=['POST'])
def process_image_route():
    data = request.get_json()
    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"error": "Missing 'image_url' in request body."}), 400
    
    result = process_image(image_url)
    return jsonify(result)

