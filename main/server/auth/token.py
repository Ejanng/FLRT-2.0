import jwt
from datetime import datetime, timedelta, timezone
from config import Config

def create_access_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=Config.ACCESS_TOKEN_EXPIRES_MINUTES),
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm=Config.ALGORITHM)
    return token

def decode_access_token(token):
    return jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])