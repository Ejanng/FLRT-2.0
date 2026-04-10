import argparse
import base64
import io
import json
import os
import pickle
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload


# Matching strictness thresholds (env configurable)
MIN_MATCH_COUNT = max(1, int(os.getenv('SIFT_MIN_MATCH_COUNT', '40')))
LOWE_RATIO_TEST = float(os.getenv('SIFT_LOWE_RATIO', '0.7'))
MIN_MATCH_RATIO = float(os.getenv('SIFT_MIN_MATCH_RATIO', '0.12'))
SECOND_BEST_MATCH_MULTIPLIER = float(os.getenv('SIFT_SECOND_BEST_MULTIPLIER', '1.25'))

# Setup paths
MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
RES_DIR = os.path.join(MODULE_DIR, 'res')
os.makedirs(RES_DIR, exist_ok=True)
os.makedirs(os.path.join(RES_DIR, 'train'), exist_ok=True)

# File paths
GDRIVE_SERVICE_ACCOUNT_FILE = os.getenv(
    'GOOGLE_SERVICE_ACCOUNT_FILE',
    os.path.join(RES_DIR, 'credentials.json'),
)
DB_FILE = os.path.join(RES_DIR, 'sift_database.pkl')
IMAGE_DIR = os.path.join(RES_DIR, 'train')

SIFT_DEBUG = os.getenv('SIFT_DEBUG', '0').strip().lower() in ('1', 'true', 'yes', 'on')
SCOPES = ['https://www.googleapis.com/auth/drive']

_DRIVE_SERVICE = None
_DRIVE_ACCOUNT_LOGGED = False

_MATCH_WORKERS = max(1, int(os.getenv('SIFT_MATCH_WORKERS', '1')))
_DB_ENTRY_CACHE_KEY = None
_DB_ENTRY_CACHE_VALUE = None
_SIFT_DETECT_LOCK = threading.RLock()
_ACTIVE_DETECTIONS = 0
_ACTIVE_DETECTIONS_LOCK = threading.Lock()


# Initiate SIFT detector
try:
    sift = cv2.SIFT_create()
except Exception:
    sift = cv2.xfeatures2d.SIFT_create()

# FLANN matcher params
FLANN_INDEX_KDITREE = 0
flannParam = dict(algorithm=FLANN_INDEX_KDITREE, tree=5)


def _log(message: str, force: bool = False):
    if force or SIFT_DEBUG:
        print(message)


def _audit_log(event: str, **fields):
    payload = {
        'event': event,
        'ts': int(time.time()),
        **fields,
    }
    print(f"SIFT_AUDIT {json.dumps(payload, sort_keys=True)}")


def log_audit_event(event: str, **fields):
    _audit_log(event, **fields)


def recommend_match_workers(db_size: int) -> int:
    if db_size < 20:
        return 1
    if db_size < 80:
        return 2
    if db_size < 200:
        return 4
    return 6


def _compute_effective_match_workers(db_size: int) -> int:
    baseline = min(_MATCH_WORKERS, recommend_match_workers(db_size))
    with _ACTIVE_DETECTIONS_LOCK:
        active = max(1, _ACTIVE_DETECTIONS)
    return max(1, baseline // active)


def _load_service_account_credentials():
    """Load service account credentials from env JSON/base64 or JSON file path."""
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
    global _DRIVE_ACCOUNT_LOGGED
    if _DRIVE_ACCOUNT_LOGGED:
        return

    try:
        about = service.about().get(fields='user(displayName,emailAddress)').execute()
        user = about.get('user') or {}
        email = user.get('emailAddress') or 'unknown-email'
        display_name = user.get('displayName') or 'Unknown User'
        _log(f"Google Drive authenticated as: {display_name} <{email}>", force=True)
    except Exception as e:
        _log(f"Could not fetch authenticated Google account details: {e}", force=True)
    finally:
        _DRIVE_ACCOUNT_LOGGED = True


def get_drive_service():
    """
    Authenticate Google Drive using service account only.
    """
    global _DRIVE_SERVICE
    if _DRIVE_SERVICE is not None:
        return _DRIVE_SERVICE

    creds = _load_service_account_credentials()
    if creds is None:
        raise RuntimeError(
            "Google Drive service-account credentials not found. "
            "Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_SERVICE_ACCOUNT_JSON(_B64)."
        )

    _DRIVE_SERVICE = build('drive', 'v3', credentials=creds)
    _log("Using Google Drive service account authentication", force=True)
    _log_authenticated_google_account(_DRIVE_SERVICE)

    try:
        validate_required_gdrive_folders(_DRIVE_SERVICE)
    except Exception as e:
        _log(f"Folder validation failed (non-blocking): {e}", force=True)

    return _DRIVE_SERVICE


def extract_gdrive_file_id(url):
    if not url or not isinstance(url, str):
        return None

    pattern1 = r'/file/d/([a-zA-Z0-9_-]+)'
    match = re.search(pattern1, url)
    if match:
        return match.group(1)

    pattern2 = r'[?&]id=([a-zA-Z0-9_-]+)'
    match = re.search(pattern2, url)
    if match:
        return match.group(1)

    pattern3 = r'uc\?.*?id=([a-zA-Z0-9_-]+)'
    match = re.search(pattern3, url)
    if match:
        return match.group(1)

    if re.match(r'^[a-zA-Z0-9_-]{20,}$', url):
        return url

    return None


def extract_folder_id(folder_url_or_id):
    if not folder_url_or_id:
        return None
    if '/folders/' in folder_url_or_id:
        return folder_url_or_id.split('/folders/')[1].split('?')[0].split('/')[0]
    if 'id=' in folder_url_or_id:
        return folder_url_or_id.split('id=')[1].split('&')[0]
    return folder_url_or_id


def ensure_gdrive_folder_exists(service, folder_url_or_id, folder_name):
    """
    Validate that folder exists and is accessible by the service account.
    This function does not create folders automatically.
    """
    if not folder_url_or_id:
        _log(f"Folder check failed: no folder URL/ID for '{folder_name}'", force=True)
        return None

    folder_id = extract_folder_id(folder_url_or_id)
    if not folder_id:
        _log(f"Could not extract folder ID from: {folder_url_or_id}", force=True)
        return None

    try:
        meta = service.files().get(
            fileId=folder_id,
            fields='id,name,mimeType',
            supportsAllDrives=True,
        ).execute()
        if meta.get('mimeType') == 'application/vnd.google-apps.folder':
            _log(f"Folder exists: '{folder_name}' (ID: {folder_id})", force=True)
            return folder_id
        _log(f"Configured ID is not a folder for '{folder_name}' (ID: {folder_id})", force=True)
        return None
    except Exception as e:
        _log(f"Folder missing/inaccessible: '{folder_name}' (ID: {folder_id}). Cause: {e}", force=True)
        return None


def validate_required_gdrive_folders(service):
    from core.config import Config

    folders_config = [
        (Config.LOST_REPORTS_GDRIVE_FOLDER_URL, 'Lost Reports'),
        (Config.FOUND_REPORTS_GDRIVE_FOLDER_URL, 'Found Reports'),
        (Config.MATCH_RESULTS_GDRIVE_FOLDER_URL, 'Match Results'),
        (Config.MANUAL_CLAIMS_GDRIVE_FOLDER_URL, 'Manual Claims'),
        (Config.PUBLIC_VIEW_GDRIVE_FOLDER_URL, 'Public View'),
        (Config.LOST_RETURNED_GDRIVE_FOLDER_URL, 'Lost Returned'),
        (Config.FOUND_RETURNED_GDRIVE_FOLDER_URL, 'Found Returned'),
    ]

    folder_status = {}
    for folder_url, folder_name in folders_config:
        if not folder_url:
            folder_status[folder_name] = {'status': 'skipped', 'folder_id': None}
            continue
        folder_id = ensure_gdrive_folder_exists(service, folder_url, folder_name)
        folder_status[folder_name] = {
            'status': 'ready' if folder_id else 'failed',
            'folder_id': folder_id,
            'configured_url': folder_url,
        }
    return folder_status


def list_images_in_folder(service, folder_id):
    query = (
        f"'{folder_id}' in parents and "
        f"(mimeType contains 'image/jpeg' or mimeType contains 'image/png') and trashed=false"
    )

    files = []
    page_token = None
    while True:
        results = service.files().list(
            q=query,
            fields='nextPageToken, files(id,name,mimeType,size)',
            pageSize=1000,
            pageToken=page_token,
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
        ).execute()
        files.extend(results.get('files', []))
        page_token = results.get('nextPageToken')
        if not page_token:
            break
    return files


def download_image_from_drive(service, file_id):
    try:
        request = service.files().get_media(fileId=file_id)
        fh = BytesIO()
        downloader = MediaIoBaseDownload(fh, request)

        done = False
        while not done:
            _, done = downloader.next_chunk()

        fh.seek(0)
        img_array = np.frombuffer(fh.read(), np.uint8)
        return cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
    except Exception as e:
        _log(f"Failed to download image {file_id}: {e}", force=True)
        return None


def load_image_from_source(source):
    """
    Load image from local path, URL, or Google Drive sharing link.
    Returns: (image_array, source_type)
    """
    if not source:
        raise ValueError('No source provided')

    gdrive_file_id = extract_gdrive_file_id(source)

    if gdrive_file_id and 'drive.google.com' in source:
        direct_url = f'https://drive.google.com/uc?export=download&id={gdrive_file_id}'
        try:
            session = requests.Session()
            response = session.get(direct_url, timeout=30, allow_redirects=True)

            if 'confirm' in response.url or 'downloadWarning' in response.text:
                for key, value in response.cookies.items():
                    if 'download' in key.lower():
                        response = session.get(f'{direct_url}&confirm={value}', timeout=30)
                        break

            response.raise_for_status()
            if 'text/html' in response.headers.get('content-type', ''):
                raise RuntimeError('Got HTML response instead of image')

            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                return img, 'gdrive_direct'
        except Exception:
            # Service-account API fallback
            service = get_drive_service()
            img = download_image_from_drive(service, gdrive_file_id)
            if img is not None:
                return img, 'gdrive_api'
            raise RuntimeError('Failed to load Google Drive image')

    if source.startswith(('http://', 'https://')):
        response = requests.get(source, timeout=30)
        response.raise_for_status()
        img_array = np.frombuffer(response.content, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise RuntimeError('Could not decode image from URL')
        return img, 'url'

    img = cv2.imread(source, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f'Could not load local image: {source}')
    return img, 'local'


def load_database():
    if os.path.exists(DB_FILE):
        try:
            if os.path.getsize(DB_FILE) == 0:
                _log(f'{DB_FILE} is empty. Starting fresh DB.', force=True)
                return []

            with open(DB_FILE, 'rb') as f:
                db = pickle.load(f)
            if not isinstance(db, list):
                _log('Database format invalid; expected list. Starting fresh DB.', force=True)
                return []

            recommended = recommend_match_workers(len(db))
            if _MATCH_WORKERS != recommended:
                _log(
                    f'Recommended SIFT_MATCH_WORKERS={recommended} for DB size={len(db)} (current={_MATCH_WORKERS})',
                    force=True,
                )
            return db
        except (EOFError, pickle.UnpicklingError) as e:
            _log(f'Corrupted database {DB_FILE}: {e}', force=True)
            return []
        except Exception as e:
            _log(f'Failed to load database {DB_FILE}: {e}', force=True)
            return []
    return []


def _persist_database(database):
    with open(DB_FILE, 'wb') as f:
        pickle.dump(database, f)


def extract_and_save_features_enhanced(
    img_source,
    img_name,
    database,
    source_url=None,
    gdrive_file_id=None,
    is_frame=False,
    is_array=False,
):
    try:
        if is_frame or is_array:
            if len(img_source.shape) == 3:
                gray = cv2.cvtColor(img_source, cv2.COLOR_BGR2GRAY)
            else:
                gray = img_source
        elif isinstance(img_source, str):
            gray = cv2.imread(img_source, cv2.IMREAD_GRAYSCALE)
            if source_url is None:
                source_url = img_source
        else:
            return False

        if gray is None:
            return False

        with _SIFT_DETECT_LOCK:
            _, desc = sift.detectAndCompute(gray, None)

        if desc is None or len(desc) == 0:
            return False

        entry = {
            'name': img_name,
            'descriptors': desc,
            'source_url': source_url,
            'gdrive_file_id': gdrive_file_id,
            'source_type': 'unknown',
        }

        if gdrive_file_id:
            entry['source_type'] = 'gdrive'
            entry['gdrive_view_link'] = f'https://drive.google.com/file/d/{gdrive_file_id}/view'
        elif source_url and source_url.startswith(('http://', 'https://')):
            entry['source_type'] = 'url'
        else:
            entry['source_type'] = 'local'

        database.append(entry)
        return True
    except Exception as e:
        _log(f'Error processing {img_name}: {e}', force=True)
        return False


def build_database_from_files(train_dir=IMAGE_DIR):
    database = []
    if not os.path.exists(train_dir):
        os.makedirs(train_dir)
        return database

    image_files = [
        f for f in os.listdir(train_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))
    ]

    for img_file in image_files:
        img_path = os.path.join(train_dir, img_file)
        extract_and_save_features_enhanced(
            img_path,
            img_file,
            database,
            source_url=img_path,
            is_frame=False,
            is_array=False,
        )

    if database:
        _persist_database(database)
    return database


def build_database_from_gdrive(folder_url):
    database = []
    try:
        service = get_drive_service()
        folder_id = extract_folder_id(folder_url)
        images = list_images_in_folder(service, folder_id)

        for img_file in images:
            img = download_image_from_drive(service, img_file['id'])
            if img is None:
                continue

            gdrive_link = f"https://drive.google.com/file/d/{img_file['id']}/view"
            extract_and_save_features_enhanced(
                img,
                img_file['name'],
                database,
                source_url=gdrive_link,
                gdrive_file_id=img_file['id'],
                is_array=True,
            )

        if database:
            _persist_database(database)
    except Exception as e:
        _log(f'Google Drive database build failed: {e}', force=True)

    return database


def build_database_from_url(image_url):
    database = []
    try:
        img, _ = load_image_from_source(image_url)
        if img is None:
            return database

        img_name = os.path.basename(image_url.split('?')[0]) or 'url_image.jpg'
        gdrive_id = extract_gdrive_file_id(image_url) if 'drive.google.com' in image_url else None

        if extract_and_save_features_enhanced(
            img,
            img_name,
            database,
            source_url=image_url,
            gdrive_file_id=gdrive_id,
            is_array=True,
        ):
            _persist_database(database)
    except Exception as e:
        _log(f'URL training failed: {e}', force=True)

    return database


def save_image_to_gdrive(image_array, filename, folder_id, add_timestamp=True, max_retries=3):
    if not folder_id:
        _audit_log('gdrive_upload_error', reason='missing_folder_id', filename=filename)
        return {'success': False, 'error': 'No folder_id provided'}

    try:
        if add_timestamp:
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{int(time.time())}{ext}"

        if not filename.endswith(('.jpg', '.jpeg', '.png')):
            filename += '.jpg'

        success, img_encoded = cv2.imencode('.jpg', image_array)
        if not success or len(img_encoded) == 0:
            raise RuntimeError('Failed to encode image')

        img_bytes = io.BytesIO(img_encoded.tobytes())
        service = get_drive_service()
        file_metadata = {'name': filename, 'parents': [folder_id]}

        last_error = None
        for attempt in range(max_retries):
            try:
                img_bytes.seek(0)
                media = MediaIoBaseUpload(img_bytes, mimetype='image/jpeg', resumable=True)
                file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id,name,webViewLink,mimeType,parents',
                    supportsAllDrives=True,
                ).execute()

                if not file.get('id'):
                    raise RuntimeError('Upload returned no file ID')

                _audit_log(
                    'gdrive_upload_success',
                    filename=file.get('name'),
                    file_id=file.get('id'),
                    folder_id=file.get('parents', [folder_id])[0],
                    attempt=attempt + 1,
                )

                return {
                    'success': True,
                    'id': file.get('id'),
                    'name': file.get('name'),
                    'view_link': file.get('webViewLink'),
                    'mime_type': file.get('mimeType'),
                    'parent_folder_id': file.get('parents', [None])[0],
                }
            except Exception as upload_e:
                last_error = upload_e
                _audit_log(
                    'gdrive_upload_retry',
                    filename=filename,
                    folder_id=folder_id,
                    attempt=attempt + 1,
                    error=str(upload_e),
                )
                if attempt < max_retries - 1:
                    time.sleep(1 * (attempt + 1))

        raise last_error or RuntimeError('Upload failed after retries')
    except Exception as e:
        error_msg = f'Upload failed: {e}'
        _audit_log('gdrive_upload_error', filename=filename, folder_id=folder_id, error=error_msg)
        return {'success': False, 'error': error_msg}


def _normalize_database_entries(database: List[Any]) -> List[Dict[str, Any]]:
    global _DB_ENTRY_CACHE_KEY, _DB_ENTRY_CACHE_VALUE

    cache_key = (id(database), len(database))
    if _DB_ENTRY_CACHE_KEY == cache_key and _DB_ENTRY_CACHE_VALUE is not None:
        return _DB_ENTRY_CACHE_VALUE

    normalized: List[Dict[str, Any]] = []
    for entry in database:
        if isinstance(entry, tuple):
            img_name, desc_train = entry
            normalized.append(
                {
                    'name': img_name,
                    'descriptors': desc_train,
                    'source_url': None,
                    'gdrive_file_id': None,
                    'gdrive_view_link': None,
                    'source_type': 'legacy',
                }
            )
        else:
            normalized.append(
                {
                    'name': entry.get('name', 'unknown'),
                    'descriptors': entry.get('descriptors'),
                    'source_url': entry.get('source_url'),
                    'gdrive_file_id': entry.get('gdrive_file_id'),
                    'gdrive_view_link': entry.get('gdrive_view_link'),
                    'source_type': entry.get('source_type', 'unknown'),
                }
            )

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
    return entry_dict, {'good_matches': score, 'match_ratio': score / float(denominator)}


def detect_from_database(test_img_source, database, output_gdrive_folder_id=None):
    global _ACTIVE_DETECTIONS

    result = {
        'success': False,
        'best_match': None,
        'match_score': 0,
        'all_matches': [],
        'saved_to_gdrive': False,
        'gdrive_file_id': None,
        'gdrive_view_link': None,
        'query_image': {
            'original_source': test_img_source,
            'source_type': None,
            'saved_to_gdrive': False,
            'gdrive_file_id': None,
            'gdrive_view_link': None,
        },
        'matched_image': {
            'name': None,
            'source_url': None,
            'source_type': None,
            'gdrive_file_id': None,
            'gdrive_view_link': None,
        },
        'error': None,
    }

    try:
        test_gray, source_type = load_image_from_source(test_img_source)
        result['query_image']['source_type'] = source_type
    except Exception as e:
        result['error'] = f'Could not load test image: {e}'
        return result

    with _SIFT_DETECT_LOCK:
        _, desc_test = sift.detectAndCompute(test_gray, None)

    if desc_test is None:
        result['error'] = 'No features in test image'
        return result

    normalized_entries = _normalize_database_entries(database)

    with _ACTIVE_DETECTIONS_LOCK:
        _ACTIVE_DETECTIONS += 1

    try:
        effective_workers = _compute_effective_match_workers(len(normalized_entries))
        if effective_workers > 1 and len(normalized_entries) >= 20:
            with ThreadPoolExecutor(max_workers=effective_workers) as executor:
                score_results = list(executor.map(lambda e: _score_entry(desc_test, e), normalized_entries))
        else:
            score_results = [_score_entry(desc_test, entry) for entry in normalized_entries]
    finally:
        with _ACTIVE_DETECTIONS_LOCK:
            _ACTIVE_DETECTIONS = max(0, _ACTIVE_DETECTIONS - 1)

    best_good = 0
    best_ratio = 0.0
    second_best_good = 0
    best_entry = None
    all_matches: List[Dict[str, Any]] = []

    for entry_dict, metrics in score_results:
        score = metrics['good_matches']
        ratio = metrics['match_ratio']
        all_matches.append(
            {
                'name': entry_dict['name'],
                'score': score,
                'match_ratio': ratio,
                'source_url': entry_dict.get('source_url'),
                'gdrive_file_id': entry_dict.get('gdrive_file_id'),
                'gdrive_view_link': entry_dict.get('gdrive_view_link'),
                'source_type': entry_dict.get('source_type', 'unknown'),
            }
        )

        if score > best_good or (score == best_good and ratio > best_ratio):
            second_best_good = best_good
            best_good = score
            best_ratio = ratio
            best_entry = entry_dict
        elif score > second_best_good:
            second_best_good = score

    all_matches.sort(key=lambda x: x['score'], reverse=True)
    result['all_matches'] = all_matches

    passes_min_count = best_good >= MIN_MATCH_COUNT
    passes_match_ratio = best_ratio >= MIN_MATCH_RATIO
    passes_second_best_gap = (
        second_best_good == 0 or best_good >= (second_best_good * SECOND_BEST_MATCH_MULTIPLIER)
    )

    if best_entry and passes_min_count and passes_match_ratio and passes_second_best_gap:
        result['success'] = True
        result['best_match'] = best_entry['name']
        result['match_score'] = best_good
        result['matched_image'] = {
            'name': best_entry['name'],
            'source_url': best_entry.get('source_url'),
            'source_type': best_entry.get('source_type', 'unknown'),
            'gdrive_file_id': best_entry.get('gdrive_file_id'),
            'gdrive_view_link': best_entry.get('gdrive_view_link'),
        }

        test_color = cv2.cvtColor(test_gray, cv2.COLOR_GRAY2BGR)
        cv2.putText(
            test_color,
            f"Match: {best_entry['name']} | Score: {best_good} | Ratio: {best_ratio:.3f}",
            (10, 35),
            cv2.FONT_HERSHEY_COMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )

        if output_gdrive_folder_id:
            upload_result = save_image_to_gdrive(
                test_color,
                f"match_{best_entry['name']}.jpg",
                output_gdrive_folder_id,
                add_timestamp=True,
                max_retries=3,
            )
            if upload_result.get('success'):
                result['saved_to_gdrive'] = True
                result['gdrive_file_id'] = upload_result.get('id')
                result['gdrive_view_link'] = upload_result.get('view_link')
                result['query_image']['saved_to_gdrive'] = True
                result['query_image']['gdrive_file_id'] = upload_result.get('id')
                result['query_image']['gdrive_view_link'] = upload_result.get('view_link')
            else:
                result['error'] = f"Match found but GDrive save failed: {upload_result.get('error')}"
    else:
        reasons = []
        if not passes_min_count:
            reasons.append(f'score {best_good} < min {MIN_MATCH_COUNT}')
        if not passes_match_ratio:
            reasons.append(f'ratio {best_ratio:.3f} < min {MIN_MATCH_RATIO:.3f}')
        if not passes_second_best_gap:
            reasons.append(
                f'best {best_good} is too close to second {second_best_good} (need x{SECOND_BEST_MATCH_MULTIPLIER:.2f})'
            )
        result['error'] = f"No match found ({'; '.join(reasons) if reasons else 'no qualifying match'})"

    return result


def main():
    parser = argparse.ArgumentParser(description='SIFT database training and matching')
    parser.add_argument(
        '--mode',
        choices=['train_local', 'train_gdrive', 'train_url', 'detect'],
        default='detect',
    )
    parser.add_argument('--source', type=str, help='Source folder URL/path/image URL')
    parser.add_argument('--test_img', type=str, help='Test image path/URL for detection')
    parser.add_argument('--output_folder', type=str, help='Drive folder ID for match outputs')
    args = parser.parse_args()

    database = load_database()

    if args.mode == 'train_local':
        source = args.source or IMAGE_DIR
        result = build_database_from_files(source)
        print(f'Trained local database with {len(result)} image(s)')
        return

    if args.mode == 'train_gdrive':
        if not args.source:
            raise SystemExit("Provide GDrive folder URL/ID via --source")
        result = build_database_from_gdrive(args.source)
        print(f'Trained Drive database with {len(result)} image(s)')
        return

    if args.mode == 'train_url':
        if not args.source:
            raise SystemExit('Provide image URL via --source')
        result = build_database_from_url(args.source)
        print(f'Trained URL database with {len(result)} image(s)')
        return

    if not database:
        raise SystemExit('No database found. Train first.')

    test_img = args.test_img or args.source
    if not test_img:
        raise SystemExit('Provide test image via --test_img or --source')

    result = detect_from_database(test_img, database, args.output_folder)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
