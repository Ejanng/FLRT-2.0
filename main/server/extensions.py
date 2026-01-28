from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_session import Session
import redis
from config import Config

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
cors = CORS()
session = Session()

redis_client = redis.Redis(host=Config.SESSION_REDIS_HOST, port=Config.SESSION_REDIS_PORT, db=Config.SESSION_REDIS_DB)