import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')

    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")

    SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret_key')
    ALGORITHM = os.getenv('ALGORITHM', 'HS256')
    ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 30))

    SESSION_TYPE = os.getenv('SESSION_TYPE', 'redis')
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')

    SESSION_REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    SESSION_REDIS_DB = int(os.getenv('REDIS_DB', 0))

