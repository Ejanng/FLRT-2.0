import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

class Config:
    REDIS_URL = os.getenv('REDIS_URL', '').strip()
    _PARSED_REDIS_URL = urlparse(REDIS_URL) if REDIS_URL else None

    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")

    SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    API_BASE_URL = os.getenv("API_BASE_URL", "http://192.168.1.131:5000")

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    ALGORITHM = os.getenv('ALGORITHM')
    ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 30))

    SESSION_TYPE = os.getenv('SESSION_TYPE', 'redis')
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_REDIS_HOST = (
        os.getenv('SESSION_REDIS_HOST')
        or os.getenv('REDIS_HOST')
        or (_PARSED_REDIS_URL.hostname if _PARSED_REDIS_URL else None)
        or 'localhost'
    )

    SESSION_REDIS_PORT = int(
        os.getenv('SESSION_REDIS_PORT')
        or os.getenv('REDIS_PORT')
        or (_PARSED_REDIS_URL.port if _PARSED_REDIS_URL and _PARSED_REDIS_URL.port else 6379)
    )

    SESSION_REDIS_DB = int(
        os.getenv('SESSION_REDIS_DB')
        or os.getenv('REDIS_DB')
        or (_PARSED_REDIS_URL.path.lstrip('/') if _PARSED_REDIS_URL and _PARSED_REDIS_URL.path else 0)
    )

    SESSION_REDIS_PASSWORD = (
        os.getenv('SESSION_REDIS_PASSWORD')
        or os.getenv('REDIS_PASSWORD')
        or (_PARSED_REDIS_URL.password if _PARSED_REDIS_URL else None)
    )
    SESSION_REDIS_USE_SSL = (
        (_PARSED_REDIS_URL.scheme == 'rediss') if _PARSED_REDIS_URL else False
    )

    GDRIVE_URL = os.getenv('GDRIVE_URL')

    LOST_REPORTS_GDRIVE_FOLDER_URL = os.getenv(
        'LOST_REPORTS_GDRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/1L67SDe_Tw0riFXWE_remlt0w0qfW-WGH?usp=drive_link'
    )
    FOUND_REPORTS_GDRIVE_FOLDER_URL = os.getenv(
        'FOUND_REPORTS_GDRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/1pHpBMkBgGkvjfUyUPTnKER2N9v8JBqdc?usp=drive_link'
    )
    MATCH_RESULTS_GDRIVE_FOLDER_URL = os.getenv(
        'MATCH_RESULTS_GDRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/1qtyquqQntdIu9FU8nnu-cmWkL6Lt1oXm?usp=drive_link'
    )
    MANUAL_CLAIMS_GDRIVE_FOLDER_URL = os.getenv(
        'MANUAL_CLAIMS_GDRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/1h3OLwV8ALpz4lY5wP9HL-EKA4oTybiLm?usp=drive_link'
    )
    PUBLIC_VIEW_GDRIVE_FOLDER_URL = os.getenv(
        'PUBLIC_VIEW_GDRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/1KF3zEkKAE5_XkMTDuYJIFbL69nYp-ayl?usp=drive_link'
    )
    LOST_RETURNED_GDRIVE_FOLDER_URL = os.getenv(
        'LOST_RETURNED_GDRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/12pRswMebNsjBkqhGjI2ij0zNXfiw9o9o?usp=drive_link'
    )
    FOUND_RETURNED_GDRIVE_FOLDER_URL = os.getenv(
        'FOUND_RETURNED_GDRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/121Lh3QbwYRHcgKfIBLkTc4KUJsFnv_r8?usp=drive_link'
    )

    DISCORD_SERVER_INVITE_URL = os.getenv(
        'DISCORD_SERVER_INVITE_URL',
        'https://discord.gg/TWPsZHvhH3'
    )
    DISCORD_ADMIN_WEBHOOK_URL = os.getenv('DISCORD_ADMIN_WEBHOOK_URL')
    DISCORD_USER_WEBHOOK_URL = os.getenv('DISCORD_USER_WEBHOOK_URL')

