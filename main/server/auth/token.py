import jwt
from datetime import datetime, timedelta, timezone
from core.config import Config

def create_access_token(user_id, role):
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=Config.ACCESS_TOKEN_EXPIRES_MINUTES),
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.ALGORITHM)
    return token

def decode_access_token(token):
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.ALGORITHM])
        print("[JWT] Decoded payload:", payload)        # debugging line shows the payload
        return payload

    except jwt.ExpiredSignatureError:
        print("[JWT] Token has expired")
        return None

    except jwt.InvalidSignatureError:
        print("[JWT] Invalid token signature")
        return None

    except jwt.DecodeError:
        print("[JWT] Token decode error (maybe malformed)")
        return None

    except Exception as e:
        print(f"[JWT] Unexpected error: {e}")
        return None
