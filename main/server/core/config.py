import os
from dotenv import load_dotenv

load_dotenv()

class Config:
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
    SESSION_REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')

    SESSION_REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    SESSION_REDIS_DB = int(os.getenv('REDIS_DB', 0))

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

