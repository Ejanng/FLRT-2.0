from functools import wraps
from flask import request, jsonify
import jwt
from auth.token import decode_access_token
from models import Admins
from core.extensions import redis_client

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization")
        
        # identify if user is authenticated or not 
        if not auth: 
            return jsonify({
                "error": "Not Authorized"
            }), 401

        
        if not auth.startswith("Bearer "): 
            return jsonify({
                "error": "Invalid Authorization header"
            }), 401
        token = auth.replace("Bearer ", "")
        
        if redis_client.sismember("jwt_blacklist", token):
            return jsonify({
                "error": "Token has been revoked"
            }), 401

        try:
            payload = decode_access_token(token)
            if not payload: 
                return jsonify({""
                    "error": "Invalid or expired token"
                }), 401
            
            admin_id = payload.get("sub")
            
            if not admin_id:
                return jsonify({
                    "error": "Admin not found"
                }), 404
            
            current_user = Admins.query.get(admin_id)

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

# used for admin-only access routes and verify reports
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != "admin":
            return jsonify({
                "error": "Admin privileges required"
            }), 403
        
        return f(current_user, *args, **kwargs)
    
    return decorated


# route for superadmin-only access to manage admins
# superadmin role is only for managing admins
def superadmin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != "superadmin":
            return jsonify({
                "error": "Superadmin privileges required"
            }), 403
        
        return f(current_user, *args, **kwargs)
        
    return decorated