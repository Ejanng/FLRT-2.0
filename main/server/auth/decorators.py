from functools import wraps
from flask import request, jsonify
import jwt
from token import decode_access_token
from models import Users

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization")

        if not auth: 
            return jsonify({
                "error": "Not Authorized"
            }), 401
        
        if not auth.startswith("Bearer "): 
            return jsonify({
                "error": "Invalid Authorization header"
            }), 401
        token = auth.replace("Bearer ", "")
        
        try:
            payload = decode_access_token(token)
            user_id = payload.get("user_id")
            
            if not user_id: 
                return jsonify({""
                    "error": "Invalid token payload"
                }), 401
            
            current_user = Users.query.get(user_id)
            
            if not current_user:
                return jsonify({
                    "error": "User not found"
                }), 404
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                "error": "Token has expired"
            }), 401
        
        except jwt.InvalidTokenError:
            return jsonify({
                "error": "Invalid token"
            }), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated