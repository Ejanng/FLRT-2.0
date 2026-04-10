"""
How to use?
First before running the server, you need to run first the algorithm.py to authenticate your Google Drive account and create the token.pickle file. This will allow the server to access your Google Drive for training and saving results.
Run the following command in your terminal:
python server/sift/algorithm.py --mode train_gdrive --source 'https://drive.google.com/drive/folders/1L67SDe_Tw0riFXWE_remlt0w0qfW-WGH'
This will authenticate your Google Drive account and create the token.pickle file in the server/sift/res/ directory. You only need to do this once. After that, you can start the server and it will use the saved token to access your Google Drive for training and saving results without needing to authenticate again.
"""



import cv2
import numpy as np
import matplotlib.pyplot as plt
import pickle
import os
import json
import base64
import argparse
import requests
import re
import time
import io
import threading
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from typing import Optional, List, Dict, Any
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

# Matching strictness thresholds (env configurable)
MIN_MATCH_COUNT = max(1, int(os.getenv('SIFT_MIN_MATCH_COUNT', '40')))
LOWE_RATIO_TEST = float(os.getenv('SIFT_LOWE_RATIO', '0.7'))
MIN_MATCH_RATIO = float(os.getenv('SIFT_MIN_MATCH_RATIO', '0.12'))
SECOND_BEST_MATCH_MULTIPLIER = float(os.getenv('SIFT_SECOND_BEST_MULTIPLIER', '1.25'))

# Setup paths - works regardless of where script is called from
MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
RES_DIR = os.path.join(MODULE_DIR, 'res')

# Ensure res directory exists
os.makedirs(RES_DIR, exist_ok=True)
os.makedirs(os.path.join(RES_DIR, 'train'), exist_ok=True)

# File paths
GDRIVE_CREDENTIALS = os.path.join(RES_DIR, "client_secret.json")
GDRIVE_SERVICE_ACCOUNT_FILE = os.getenv(
    'GOOGLE_SERVICE_ACCOUNT_FILE',
    os.path.join(RES_DIR, 'credentials.json')
)
TOKEN_FILE = os.path.join(RES_DIR, "token.pickle")
DB_FILE = os.path.join(RES_DIR, "sift_database.pkl")
IMAGE_DIR = os.path.join(RES_DIR, "train")

SIFT_DEBUG = os.getenv('SIFT_DEBUG', '0').strip().lower() in ('1', 'true', 'yes', 'on')


def _log(message: str, force: bool = False):
    if force or SIFT_DEBUG:
        print(message)

_log(f"SIFT module directory: {MODULE_DIR}")
_log(f"Resources directory: {RES_DIR}")
_log(f"Credentials file: {GDRIVE_CREDENTIALS}")
_log(f"   Credentials exist: {os.path.exists(GDRIVE_CREDENTIALS)}")
_log(f"Token file: {TOKEN_FILE}")
_log(f"   Token exists: {os.path.exists(TOKEN_FILE)}")

# Use FULL ACCESS scope for everything (so token is consistent)
SCOPES = ['https://www.googleapis.com/auth/drive']
_DRIVE_SERVICE = None
_MATCH_WORKERS = max(1, int(os.getenv('SIFT_MATCH_WORKERS', '1')))
_DB_ENTRY_CACHE_KEY = None
_DB_ENTRY_CACHE_VALUE = None
_SIFT_DETECT_LOCK = threading.RLock()
_DRIVE_ACCOUNT_LOGGED = False
_ACTIVE_DETECTIONS = 0
_ACTIVE_DETECTIONS_LOCK = threading.Lock()
_PREFER_SERVICE_ACCOUNT = os.getenv('SIFT_PREFER_SERVICE_ACCOUNT', '1').strip().lower() in (
    '1', 'true', 'yes', 'on'
)


def recommend_match_workers(db_size: int) -> int:
    if db_size < 20:
        return 1
    if db_size < 80:
        return 2
    if db_size < 200:
        return 4
    return 6


def _compute_effective_match_workers(db_size: int) -> int:
    """Adapt in-request matcher parallelism based on active detection load."""
    baseline = min(_MATCH_WORKERS, recommend_match_workers(db_size))
    with _ACTIVE_DETECTIONS_LOCK:
        active = max(1, _ACTIVE_DETECTIONS)
    return max(1, baseline // active)

# Initiate SIFT detector
try:
    sift = cv2.SIFT_create()
except:
    sift = cv2.xfeatures2d.SIFT_create()

# Create the Flann Matcher object
FLANN_INDEX_KDITREE = 0
flannParam = dict(algorithm=FLANN_INDEX_KDITREE, tree=5)
flann = cv2.FlannBasedMatcher(flannParam, {})


def get_drive_service():
    """
    Authenticate Google Drive in this order:
    1) Service account (Render/server-friendly)
    2) Existing OAuth token.pickle
    3) Interactive OAuth flow (local/dev)
    """
    global _DRIVE_SERVICE
    if _DRIVE_SERVICE is not None:
        return _DRIVE_SERVICE

    if _PREFER_SERVICE_ACCOUNT:
        service_account_creds = _load_service_account_credentials()
        if service_account_creds is not None:
            _DRIVE_SERVICE = build('drive', 'v3', credentials=service_account_creds)
            _log("Using Google Drive service account authentication", force=True)
            _log_authenticated_google_account(_DRIVE_SERVICE)
            return _DRIVE_SERVICE

    creds = None
    
    # Load existing token
    if os.path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE, 'rb') as token:
                creds = pickle.load(token)
            _log("Key: Loaded saved credentials", force=True)
        except Exception as e:
            _log(f"Error: Could not load token: {e}", force=True)
            creds = None
    
    # If no valid credentials, get new ones
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            _log("Refreshing expired token...", force=True)
            creds.refresh(Request())
            _log("Ok: Token refreshed!", force=True)
        else:
            if not os.path.exists(GDRIVE_CREDENTIALS):
                raise FileNotFoundError(
                    f"Credentials not found at: {GDRIVE_CREDENTIALS}\n"
                    f"   Current directory: {os.getcwd()}\n"
                    f"   Expected: {GDRIVE_CREDENTIALS}\n"
                    "   Please ensure client_secret.json is in sift/res/ folder"
                )
            
            _log("Opening browser for Google authentication...", force=True)
            _log("   (This will only happen once)", force=True)
            flow = InstalledAppFlow.from_client_secrets_file(
                GDRIVE_CREDENTIALS,
                scopes=SCOPES
            )
            creds = flow.run_local_server(port=0)
            _log("Ok: Authentication successful!", force=True)
        
        # Save token for future runs
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
            _log("Credentials saved", force=True)
    else:
        _log("Ok: Using existing valid credentials")
    
    _DRIVE_SERVICE = build('drive', 'v3', credentials=creds)
    _log_authenticated_google_account(_DRIVE_SERVICE)
    return _DRIVE_SERVICE


def _load_service_account_credentials():
    """Load service account credentials from env JSON/base64 or a JSON file path."""
    json_text = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    json_b64 = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', '').strip()

    if json_text:
        try:
            info = json.loads(json_text)
            return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        except Exception as e:
            _log(f"Service account JSON env parse failed: {e}", force=True)

    if json_b64:
        try:
            decoded = base64.b64decode(json_b64).decode('utf-8')
            info = json.loads(decoded)
            return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        except Exception as e:
            _log(f"Service account base64 env parse failed: {e}", force=True)

    if os.path.exists(GDRIVE_SERVICE_ACCOUNT_FILE):
        try:
            return service_account.Credentials.from_service_account_file(
                GDRIVE_SERVICE_ACCOUNT_FILE,
                scopes=SCOPES,
            )
        except Exception as e:
            _log(f"Service account file load failed ({GDRIVE_SERVICE_ACCOUNT_FILE}): {e}", force=True)

    return None


def _log_authenticated_google_account(service):
    """Debug helper: prints which Google account is currently authenticated."""
    global _DRIVE_ACCOUNT_LOGGED
    if _DRIVE_ACCOUNT_LOGGED:
        return

    try:
        about = service.about().get(fields='user(displayName,emailAddress)').execute()
        user = about.get('user') or {}
        email = user.get('emailAddress') or 'unknown-email'
        display_name = user.get('displayName') or 'Unknown User'
        _log(f"🔐 Google Drive authenticated as: {display_name} <{email}>", force=True)
    except Exception as e:
        _log(f"⚠️ Could not fetch authenticated Google account details: {e}", force=True)
    finally:
        _DRIVE_ACCOUNT_LOGGED = True


def extract_gdrive_file_id(url):
    """
    Extract Google Drive file ID from various URL formats
    """
    if not url or not isinstance(url, str):
        return None
    
    # Pattern 1: https://drive.google.com/file/d/FILE_ID/view 
    pattern1 = r'/file/d/([a-zA-Z0-9_-]+)'
    match = re.search(pattern1, url)
    if match:
        return match.group(1)
    
    # Pattern 2: https://drive.google.com/open?id=FILE_ID 
    pattern2 = r'[?&]id=([a-zA-Z0-9_-]+)'
    match = re.search(pattern2, url)
    if match:
        return match.group(1)
    
    # Pattern 3: https://drive.google.com/uc?id=FILE_ID 
    pattern3 = r'uc\?.*?id=([a-zA-Z0-9_-]+)'
    match = re.search(pattern3, url)
    if match:
        return match.group(1)
    
    # If it's just the ID itself (no URL)
    if re.match(r'^[a-zA-Z0-9_-]{20,}$', url):
        return url
    
    return None


def extract_folder_id(folder_url):
    """Extract folder ID from various Google Drive URL formats"""
    if '/folders/' in folder_url:
        return folder_url.split('/folders/')[1].split('?')[0].split('/')[0]
    elif 'id=' in folder_url:
        return folder_url.split('id=')[1].split('&')[0]
    return folder_url  # Assume it's already an ID


def list_images_in_folder(service, folder_id):
    """List all image files in a Google Drive folder"""
    query = (f"'{folder_id}' in parents and "
             f"(mimeType contains 'image/jpeg' or mimeType contains 'image/png') "
             f"and trashed=false")
    
    files = []
    page_token = None
    while True:
        results = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType, size)",
            pageSize=1000,
            pageToken=page_token,
        ).execute()
        files.extend(results.get('files', []))
        page_token = results.get('nextPageToken')
        if not page_token:
            break
    return files


def download_image_from_drive(service, file_id):
    """Download image from Drive and return as OpenCV image (numpy array)"""
    try:
        request = service.files().get_media(fileId=file_id)
        fh = BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        fh.seek(0)
        img_array = np.frombuffer(fh.read(), np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
        return img
    except Exception as e:
        print(f"Error: Failed to download image {file_id}: {e}")
        return None


def load_image_from_source(source):
    """
    Load image from local path, URL, or Google Drive sharing link
    Returns: (image_array, source_type)
    """
    if not source:
        raise ValueError("No source provided")
    
    print(f"Loading from: {source[:80]}...")
    
    # Check if it's a Google Drive URL
    gdrive_file_id = extract_gdrive_file_id(source)
    
    if gdrive_file_id and 'drive.google.com' in source:
        print(f"Detected Google Drive file ID: {gdrive_file_id}")
        
        # Method 1: Try direct download URL first (fastest, no API needed)
        direct_url = f"https://drive.google.com/uc?export=download&id={gdrive_file_id}"
        print(f"Trying direct download...")
        
        try:
            # Use session to handle redirects
            session = requests.Session()
            response = session.get(direct_url, timeout=30, allow_redirects=True)
            
            # Check if we got a confirmation page (large file warning)
            if 'confirm' in response.url or 'downloadWarning' in response.text:
                # Extract confirm token
                for key, value in response.cookies.items():
                    if 'download' in key.lower():
                        confirm_url = f"{direct_url}&confirm={value}"
                        response = session.get(confirm_url, timeout=30)
                        break
            
            response.raise_for_status()
            
            # Check if we got HTML instead of image
            if 'text/html' in response.headers.get('content-type', ''):
                raise Exception("Got HTML page instead of image (file may be too large or private)")
            
            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
            
            if img is not None:
                print(f"Success: Successfully loaded via direct download")
                return img, 'gdrive_direct'
            else:
                raise Exception("Could not decode image")
                
        except Exception as e:
            print(f"Error: Direct download failed: {e}")
            
            # Method 2: Try Google Drive API if credentials exist
            if os.path.exists(GDRIVE_CREDENTIALS):
                print(f"Secured: Trying Google Drive API...")
                try:
                    service = get_drive_service()  # Uses saved token!
                    img = download_image_from_drive(service, gdrive_file_id)
                    if img is not None:
                        print(f"Success: Successfully loaded via Drive API")
                        return img, 'gdrive_api'
                except Exception as api_e:
                    print(f"Error: Drive API failed: {api_e}")
    
    # Handle regular HTTP/HTTPS URLs
    if source.startswith(('http://', 'https://')):
        print(f"Downloading from URL...")
        try:
            response = requests.get(source, timeout=30)
            response.raise_for_status()
            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                print(f"Success: Successfully loaded from URL")
                return img, 'url'
            else:
                raise Exception("Could not decode image from URL")
        except Exception as e:
            raise Exception(f"Failed to download from URL: {e}")
    
    # Handle local files
    print(f"Folder: Loading local file...")
    img = cv2.imread(source, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Could not load local image: {source}")
    print(f"Success: Successfully loaded local file")
    return img, 'local'


def load_database():
    """Load existing database - FIXED for empty/corrupted files"""
    if os.path.exists(DB_FILE):
        try:
            # Check file size first
            if os.path.getsize(DB_FILE) == 0:
                print(f"Error: {DB_FILE} is empty - starting fresh")
                return []
            
            with open(DB_FILE, 'rb') as f:
                db = pickle.load(f)
                print(f"Success: Loaded database: {len(db)} objects")
                recommended = recommend_match_workers(len(db))
                if _MATCH_WORKERS != recommended:
                    print(
                        f"Info: Recommended SIFT_MATCH_WORKERS={recommended} for DB size={len(db)} "
                        f"(current={_MATCH_WORKERS})"
                    )
                else:
                    _log(
                        f"Info: SIFT_MATCH_WORKERS={_MATCH_WORKERS} is optimal for DB size={len(db)}",
                        force=True,
                    )
                return db
        except (EOFError, pickle.UnpicklingError) as e:
            print(f"Error: Corrupted database {DB_FILE}: {e}")
            print("Restart: Starting fresh database")
            return []
    return []


def extract_and_save_features_enhanced(img_source, img_name, database, 
                                        source_url=None, gdrive_file_id=None,
                                        is_frame=False, is_array=False):
    """
    Extract SIFT features and save to database with source metadata
    img_source: can be file path, frame, or numpy array
    source_url: original URL or path of the image
    gdrive_file_id: Google Drive file ID if applicable
    """
    try:
        if is_frame or is_array:
            if len(img_source.shape) == 3:
                gray = cv2.cvtColor(img_source, cv2.COLOR_BGR2GRAY)
            else:
                gray = img_source
        elif isinstance(img_source, str):
            gray = cv2.imread(img_source, cv2.IMREAD_GRAYSCALE)
            # If no source_url provided for local file, use the path
            if source_url is None:
                source_url = img_source
        else:
            return False
        
        if gray is None:
            print(f"Error: Could not load image: {img_name}")
            return False
        
        with _SIFT_DETECT_LOCK:
            kp, desc = sift.detectAndCompute(gray, None)
        
        if desc is not None and len(desc) > 0:
            # Store as dictionary with metadata
            entry = {
                'name': img_name,
                'descriptors': desc,
                'source_url': source_url,           # Original URL/path
                'gdrive_file_id': gdrive_file_id,  # GDrive ID if applicable
                'source_type': 'unknown'
            }
            
            # Determine source type
            if gdrive_file_id:
                entry['source_type'] = 'gdrive'
                # Generate view link if we have the file ID
                entry['gdrive_view_link'] = f"https://drive.google.com/file/d/{gdrive_file_id}/view"
            elif source_url and source_url.startswith(('http://', 'https://')):
                entry['source_type'] = 'url'
            else:
                entry['source_type'] = 'local'
            
            database.append(entry)
            print(f"Success: SAVED '{img_name}' to database ({len(desc)} descriptors)")
            if source_url and len(source_url) > 60:
                print(f"   Source: {source_url[:60]}...")
            else:
                print(f"   Source: {source_url}")
            return True
        else:
            print(f"Error: No features found in {img_name}")
            return False
            
    except Exception as e:
        print(f"Wrong Syntax: Error processing {img_name}: {e}")
        return False


def build_database_from_files(train_dir=IMAGE_DIR):
    """
    Build database from local image files in folder
    """
    database = []
    if not os.path.exists(train_dir):
        os.makedirs(train_dir)
        print(f"Folder: Created {train_dir}. Add .jpg/.png files there.")
        return database
    
    image_files = [f for f in os.listdir(train_dir) 
                   if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))]
    
    if not image_files:
        print(f"Error: No images found in {train_dir}")
        return database
    
    print(f"Photo: Found {len(image_files)} images in local folder")
    
    for img_file in image_files:
        img_path = os.path.join(train_dir, img_file)
        # For local files, store the full path as source_url
        extract_and_save_features_enhanced(
            img_path, 
            img_file, 
            database,
            source_url=img_path,  # Store local path
            is_frame=False,
            is_array=False
        )
    
    # Save database
    if database:
        with open(DB_FILE, 'wb') as f:
            pickle.dump(database, f)
        print(f"Database saved: {DB_FILE} ({len(database)} images)")
    
    return database


def build_database_from_gdrive(folder_url):
    """
    Build database directly from Google Drive folder (stores GDrive IDs)
    """
    database = []
    
    try:
        print("Secured: Authenticating with Google Drive...")
        service = get_drive_service()
        
        folder_id = extract_folder_id(folder_url)
        print(f"Folder ID: {folder_id}")
        
        print("Listing images in folder...")
        images = list_images_in_folder(service, folder_id)
        
        if not images:
            print("Error: No images found in folder.")
            return database
        
        print(f"Photo: Found {len(images)} images in Google Drive folder")
        
        for idx, img_file in enumerate(images, 1):
            print(f"\n[{idx}/{len(images)}] Processing: {img_file['name']}")
            
            # Download image to memory
            img = download_image_from_drive(service, img_file['id'])
            
            if img is not None:
                # Pass the GDrive file ID and construct view link
                gdrive_link = f"https://drive.google.com/file/d/{img_file['id']}/view"
                
                extract_and_save_features_enhanced(
                    img, 
                    img_file['name'], 
                    database,
                    source_url=gdrive_link,      # Store the GDrive link as source
                    gdrive_file_id=img_file['id'],  # Store the file ID
                    is_array=True
                )
        
        # Save database locally
        if database:
            with open(DB_FILE, 'wb') as f:
                pickle.dump(database, f)
            print(f"\nDatabase saved: {DB_FILE} ({len(database)} images)")
        
    except Exception as e:
        print(f"Wrong Syntax: Google Drive error: {e}")
    
    return database


def build_database_from_url(image_url):
    """
    Build database from a single image URL (http/https)
    """
    database = []
    
    try:
        img, source_type = load_image_from_source(image_url)
        
        if img is not None:
            img_name = os.path.basename(image_url.split('?')[0]) or "url_image.jpg"
            
            # Determine if it's a GDrive URL and extract ID
            gdrive_id = None
            if 'drive.google.com' in image_url:
                gdrive_id = extract_gdrive_file_id(image_url)
            
            if extract_and_save_features_enhanced(
                img, 
                img_name, 
                database,
                source_url=image_url,
                gdrive_file_id=gdrive_id,
                is_array=True
            ):
                # Save single image database
                with open(DB_FILE, 'wb') as f:
                    pickle.dump(database, f)
                print(f"Database saved: {DB_FILE}")
        else:
            print("Wrong Syntax: Could not decode image from URL")
            
    except Exception as e:
        print(f"Wrong Syntax: Error: {e}")


def save_image_to_gdrive(image_array, filename, folder_id, add_timestamp=True):
    """
    Save OpenCV image array to Google Drive folder
    """
    try:
        # Add timestamp to filename
        if add_timestamp:
            name, ext = os.path.splitext(filename)
            timestamp = int(time.time())
            filename = f"{name}_{timestamp}{ext}"
        
        if not filename.endswith(('.jpg', '.jpeg', '.png')):
            filename += '.jpg'
        
        # Encode image
        success, img_encoded = cv2.imencode('.jpg', image_array)
        if not success:
            raise Exception("Failed to encode image")
        
        img_bytes = io.BytesIO(img_encoded.tobytes())
        
        # Use saved credentials (same as training!)
        service = get_drive_service()
        
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }
        
        media = MediaIoBaseUpload(img_bytes, mimetype='image/jpeg', resumable=True)
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, mimeType'
        ).execute()
        
        print(f"Success: Uploaded: {file.get('name')} (ID: {file.get('id')})")
        
        return {
            'success': True,
            'id': file.get('id'),
            'name': file.get('name'),
            'view_link': file.get('webViewLink'),
            'mime_type': file.get('mimeType')
        }
        
    except Exception as e:
        print(f"Wrong Syntax: Upload failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def detect_from_database(test_img_source, database, output_gdrive_folder_id=None):
    """
    Detect/match test image against trained database
    Returns enhanced result with both query and matched image info
    """
    global _ACTIVE_DETECTIONS

    result = {
        'success': False,
        'best_match': None,
        'match_score': 0,
        'all_matches': [],
        'saved_to_gdrive': False,
        'gdrive_file_id': None,
        'gdrive_view_link': None,
        # Query image info
        'query_image': {
            'original_source': test_img_source,
            'source_type': None,
            'saved_to_gdrive': False,
            'gdrive_file_id': None,
            'gdrive_view_link': None
        },
        # Matched image info
        'matched_image': {
            'name': None,
            'source_url': None,
            'source_type': None,
            'gdrive_file_id': None,
            'gdrive_view_link': None
        },
        'error': None
    }
    
    try:
        test_gray, source_type = load_image_from_source(test_img_source)
        result['query_image']['source_type'] = source_type
    except Exception as e:
        error_msg = f"Could not load test image: {e}"
        print(f"Wrong Syntax: {error_msg}")
        result['error'] = error_msg
        return result
        
    with _SIFT_DETECT_LOCK:
        kp_test, desc_test = sift.detectAndCompute(test_gray, None)
    
    if desc_test is None:
        error_msg = "No features in test image"
        print(f"Error: {error_msg}")
        result['error'] = error_msg
        return result
    
    best_good = 0
    best_ratio = 0.0
    second_best_good = 0
    best_entry = None  # Store the full database entry, not just name
    all_matches: List[Dict[str, Any]] = []
    
    print(f"\nMatching against {len(database)} database images...")
    
    normalized_entries = _normalize_database_entries(database)

    effective_workers = 1
    with _ACTIVE_DETECTIONS_LOCK:
        _ACTIVE_DETECTIONS += 1
        active_snapshot = _ACTIVE_DETECTIONS

    try:
        effective_workers = _compute_effective_match_workers(len(normalized_entries))
        _log(
            f"SIFT load balance: active_detections={active_snapshot}, "
            f"match_workers={effective_workers}, db_size={len(normalized_entries)}",
        )

        if effective_workers > 1 and len(normalized_entries) >= 20:
            with ThreadPoolExecutor(max_workers=effective_workers) as executor:
                score_results = list(executor.map(lambda e: _score_entry(desc_test, e), normalized_entries))
        else:
            score_results = [_score_entry(desc_test, entry) for entry in normalized_entries]
    finally:
        with _ACTIVE_DETECTIONS_LOCK:
            _ACTIVE_DETECTIONS = max(0, _ACTIVE_DETECTIONS - 1)

    for entry_dict, metrics in score_results:
        score = metrics['good_matches']
        ratio = metrics['match_ratio']
        all_matches.append({
            'name': entry_dict['name'],
            'score': score,
            'match_ratio': ratio,
            'source_url': entry_dict.get('source_url'),
            'gdrive_file_id': entry_dict.get('gdrive_file_id'),
            'gdrive_view_link': entry_dict.get('gdrive_view_link'),
            'source_type': entry_dict.get('source_type', 'unknown')
        })
        if score > best_good or (score == best_good and ratio > best_ratio):
            second_best_good = best_good
            best_good = score
            best_ratio = ratio
            best_entry = entry_dict
        elif score > second_best_good:
            second_best_good = score
    
    # Sort all matches by score
    all_matches.sort(key=lambda x: x['score'], reverse=True)
    result['all_matches'] = all_matches
    
    print(f"\n Top matches:")
    for match in all_matches[:5]:
        status = "Success:" if (
            match['score'] >= MIN_MATCH_COUNT and match['match_ratio'] >= MIN_MATCH_RATIO
        ) else "Wrong Syntax:"
        source_info = f" ({match['source_type']})" if match['source_type'] else ""
        print(
            f"   {status} {match['name']}: {match['score']} matches "
            f"(ratio={match['match_ratio']:.3f}){source_info}"
        )
    
    passes_min_count = best_good >= MIN_MATCH_COUNT
    passes_match_ratio = best_ratio >= MIN_MATCH_RATIO
    passes_second_best_gap = (
        second_best_good == 0
        or best_good >= (second_best_good * SECOND_BEST_MATCH_MULTIPLIER)
    )

    if best_entry and passes_min_count and passes_match_ratio and passes_second_best_gap:
        result['success'] = True
        result['best_match'] = best_entry['name']
        result['match_score'] = best_good
        
        # Populate matched image info
        result['matched_image'] = {
            'name': best_entry['name'],
            'source_url': best_entry.get('source_url'),
            'source_type': best_entry.get('source_type', 'unknown'),
            'gdrive_file_id': best_entry.get('gdrive_file_id'),
            'gdrive_view_link': best_entry.get('gdrive_view_link')
        }
        
        print(
            f"\nRESULT: Best match is '{best_entry['name']}' with {best_good} matches "
            f"(ratio={best_ratio:.3f})"
        )
        print(f"   Matched image source: {best_entry.get('source_url', 'N/A')}")
        
        # Create annotated image
        test_color = cv2.cvtColor(test_gray, cv2.COLOR_GRAY2BGR)
        text = f'Match: {best_entry["name"]}'
        (text_width, text_height), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_COMPLEX, 1, 2)
        
        cv2.rectangle(test_color, (10, 10), (10 + text_width, 40), (0, 0, 0), -1)
        cv2.putText(test_color, text, (10, 35), 
                   cv2.FONT_HERSHEY_COMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(test_color, f'Score: {best_good} matches', 
                   (10, 80), cv2.FONT_HERSHEY_COMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(test_color, f'Ratio: {best_ratio:.3f}',
               (10, 115), cv2.FONT_HERSHEY_COMPLEX, 0.7, (0, 255, 0), 2)
        
        # Save to Google Drive if folder provided
        if output_gdrive_folder_id:
            try:
                print(f"Saving matched result to Google Drive...")
                
                upload_result = save_image_to_gdrive(
                    test_color, 
                    f"match_{best_entry['name']}.jpg", 
                    output_gdrive_folder_id
                )
                
                if upload_result['success']:
                    result['saved_to_gdrive'] = True
                    result['gdrive_file_id'] = upload_result['id']
                    result['gdrive_view_link'] = upload_result['view_link']
                    
                    # Also update query_image section
                    result['query_image']['saved_to_gdrive'] = True
                    result['query_image']['gdrive_file_id'] = upload_result['id']
                    result['query_image']['gdrive_view_link'] = upload_result['view_link']
                    
                    print(f"Success: Saved to Google Drive: {upload_result['name']}")
                else:
                    raise Exception(upload_result.get('error', 'Unknown upload error'))
                
            except Exception as e:
                print(f"Error: Failed to save to Google Drive: {e}")
                result['error'] = f"Match found but GDrive save failed: {e}"
        
    else:
        reasons = []
        if not passes_min_count:
            reasons.append(f"score {best_good} < min {MIN_MATCH_COUNT}")
        if not passes_match_ratio:
            reasons.append(f"ratio {best_ratio:.3f} < min {MIN_MATCH_RATIO:.3f}")
        if not passes_second_best_gap:
            reasons.append(
                f"best {best_good} is too close to second {second_best_good} "
                f"(need x{SECOND_BEST_MATCH_MULTIPLIER:.2f})"
            )
        detail = "; ".join(reasons) if reasons else "no qualifying match"
        print(f"\nWrong Syntax: No sufficient matches found ({detail})")
        result['error'] = f"No match found ({detail})"
    
    return result


def _normalize_database_entries(database: List[Any]) -> List[Dict[str, Any]]:
    global _DB_ENTRY_CACHE_KEY, _DB_ENTRY_CACHE_VALUE

    cache_key = (id(database), len(database))
    if _DB_ENTRY_CACHE_KEY == cache_key and _DB_ENTRY_CACHE_VALUE is not None:
        return _DB_ENTRY_CACHE_VALUE

    normalized: List[Dict[str, Any]] = []
    for entry in database:
        if isinstance(entry, tuple):
            img_name, desc_train = entry
            normalized.append({
                'name': img_name,
                'descriptors': desc_train,
                'source_url': None,
                'gdrive_file_id': None,
                'gdrive_view_link': None,
                'source_type': 'legacy',
            })
        else:
            normalized.append({
                'name': entry.get('name', 'unknown'),
                'descriptors': entry.get('descriptors'),
                'source_url': entry.get('source_url'),
                'gdrive_file_id': entry.get('gdrive_file_id'),
                'gdrive_view_link': entry.get('gdrive_view_link'),
                'source_type': entry.get('source_type', 'unknown'),
            })

    _DB_ENTRY_CACHE_KEY = cache_key
    _DB_ENTRY_CACHE_VALUE = normalized
    return normalized


def _score_entry(desc_test: np.ndarray, entry_dict: Dict[str, Any]):
    desc_train = entry_dict.get('descriptors')
    if desc_train is None or len(desc_train) < 2:
        return entry_dict, {'good_matches': 0, 'match_ratio': 0.0}

    try:
        local_flann = cv2.FlannBasedMatcher(flannParam, {})
        matches = local_flann.knnMatch(desc_test, desc_train, k=2)
    except cv2.error:
        return entry_dict, {'good_matches': 0, 'match_ratio': 0.0}

    score = 0
    for pair in matches:
        if len(pair) < 2:
            continue
        m, n = pair
        if m.distance < LOWE_RATIO_TEST * n.distance:
            score += 1
    denominator = max(1, min(len(desc_test), len(desc_train)))
    match_ratio = score / float(denominator)
    return entry_dict, {'good_matches': score, 'match_ratio': match_ratio}


def build_database_live_capture():
    """Interactive live capture mode (placeholder)"""
    print("Camera: Live capture mode not implemented yet")
    print("Planned: Open webcam, press 's' to save frame, 'q' to quit")


def detect_live_from_database():
    """Live detection from webcam (placeholder)"""
    print("Record: Live detection mode not implemented yet")
    print("Planned: Continuous webcam feed with real-time matching")


def main():
    parser = argparse.ArgumentParser(description="SIFT Database Training & Detection")
    parser.add_argument('--mode', choices=['train_local', 'train_gdrive', 'train_url', 'detect', 'detect_live'], 
                       default='detect', help="Mode: train_local, train_gdrive, train_url, detect, detect_live")
    parser.add_argument('--source', type=str, 
                       help="Source: local folder path, GDrive URL, or image URL")
    parser.add_argument('--test_img', type=str, help="Test image path/URL for detection")
    parser.add_argument('--output_folder', type=str, 
                       help="Google Drive folder ID to save match results")
    
    args = parser.parse_args()
    
    database = load_database()
    
    if args.mode == 'train_local':
        print("=== LOCAL TRAINING MODE ===")
        source = args.source or IMAGE_DIR
        build_database_from_files(source)
        
    elif args.mode == 'train_gdrive':
        print("=== GOOGLE DRIVE TRAINING MODE ===")
        if not args.source:
            print("Wrong Syntax: Provide GDrive folder URL: --source 'https://drive.google.com/drive/folders/ ...'")
            return
        build_database_from_gdrive(args.source)
        
    elif args.mode == 'train_url':
        print("=== URL TRAINING MODE ===")
        if not args.source:
            print("Wrong Syntax: Provide image URL: --source 'https://example.com/image.jpg'")
            return
        build_database_from_url(args.source)
        
    elif args.mode == 'detect':
        if not database:
            print("Wrong Syntax: No database found. Train first!")
            print("   Local:  python sift_db.py --mode train_local")
            print("   GDrive: python sift_db.py --mode train_gdrive --source <folder_url>")
            return
        
        test_img = args.test_img or args.source
        if not test_img:
            print("Wrong Syntax: Provide test image: --test_img path_or_url_to_image.jpg")
            return
            
        print("=== DETECTION MODE ===")
        
        # Call with optional output folder
        result = detect_from_database(test_img, database, args.output_folder)
        
        # Print summary for automation/logging
        print(f"\n# RESULT SUMMARY:")
        print(f"   Success: {result['success']}")
        print(f"   Best Match: {result['best_match']}")
        print(f"   Score: {result['match_score']}")
        print(f"   Saved to GDrive: {result['saved_to_gdrive']}")
        if result.get('gdrive_file_id'):
            print(f"   GDrive File ID: {result['gdrive_file_id']}")
            print(f"   View Link: {result.get('gdrive_view_link', 'N/A')}")
        
    elif args.mode == 'detect_live':
        print("=== LIVE DETECTION MODE ===")
        detect_live_from_database()


if __name__ == "__main__":
    main()