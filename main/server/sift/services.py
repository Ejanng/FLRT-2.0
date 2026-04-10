import sift.algorithm as sift
import os
import pickle
import re
import threading
import atexit
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from contextlib import contextmanager
from typing import Optional, Iterable, Set
from core.config import Config


DEFAULT_GDRIVE_OUTPUT_FOLDER_ID = "1qtyquqQntdIu9FU8nnu-cmWkL6Lt1oXm"

SIFT_DB_DIR = os.path.join(os.path.dirname(sift.DB_FILE), 'databases')
os.makedirs(SIFT_DB_DIR, exist_ok=True)

LOST_DB_FILE = os.path.join(SIFT_DB_DIR, 'lost_reports_sift_database.pkl')
FOUND_DB_FILE = os.path.join(SIFT_DB_DIR, 'found_reports_sift_database.pkl')
_AUTO_BUILD_EMPTY_ATTEMPTS: set[str] = set()


def _ensure_folder_ready(folder_url_or_id: Optional[str], folder_name: str) -> Optional[str]:
    """
    Ensure a Google Drive folder is ready (exists or create if missing).
    Safe to call multiple times - subsequent calls will just verify it exists.
    
    Returns:
        Folder ID if ready, None if failed
    """
    if not folder_url_or_id:
        return None
    
    try:
        service = sift.get_drive_service()
        folder_id = sift.ensure_gdrive_folder_exists(service, folder_url_or_id, folder_name)
        return folder_id
    except Exception as e:
        _log(f"[FOLDER ERROR] Could not ensure folder ready '{folder_name}': {e}", force=True)
        return None

_DB_FILE_SWITCH_LOCK = threading.RLock()
_SIFT_MAX_CONCURRENT_JOBS = max(1, int(os.getenv('SIFT_MAX_CONCURRENT_JOBS', '2')))
_SIFT_JOB_WAIT_TIMEOUT_SECONDS = max(1, int(os.getenv('SIFT_JOB_WAIT_TIMEOUT_SECONDS', '25')))
_SIFT_JOB_EXEC_TIMEOUT_SECONDS = max(5, int(os.getenv('SIFT_JOB_EXEC_TIMEOUT_SECONDS', '180')))
_SIFT_QUEUE_MAX_SIZE = max(_SIFT_MAX_CONCURRENT_JOBS, int(os.getenv('SIFT_QUEUE_MAX_SIZE', str(_SIFT_MAX_CONCURRENT_JOBS * 3))))
_SIFT_WORKER_POOL_SIZE = max(1, int(os.getenv('SIFT_WORKER_POOL_SIZE', str(_SIFT_MAX_CONCURRENT_JOBS))))
_SIFT_QUEUE_SEMAPHORE = threading.BoundedSemaphore(_SIFT_QUEUE_MAX_SIZE)
_SIFT_JOB_EXECUTOR = ThreadPoolExecutor(max_workers=_SIFT_WORKER_POOL_SIZE, thread_name_prefix='sift-job')
_SIFT_VERBOSE_LOGS = os.getenv('SIFT_VERBOSE_LOGS', '0').strip().lower() in ('1', 'true', 'yes', 'on')


def _log(message: str, force: bool = False):
    if force or _SIFT_VERBOSE_LOGS:
        print(message)


def _shutdown_sift_executor():
    try:
        _SIFT_JOB_EXECUTOR.shutdown(wait=False, cancel_futures=True)
    except Exception:
        # Best-effort shutdown during interpreter exit.
        pass


atexit.register(_shutdown_sift_executor)


def _extract_folder_id(folder_url_or_id: Optional[str]) -> Optional[str]:
    if not folder_url_or_id:
        return None
    value = folder_url_or_id.strip()
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', value)
    if match:
        return match.group(1)
    match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', value)
    if match:
        return match.group(1)
    return value


def _db_file_for_target_status(target_status: str) -> str:
    if target_status == 'lost':
        return LOST_DB_FILE
    return FOUND_DB_FILE


def _folder_url_for_target_status(target_status: str) -> str:
    if target_status == 'lost':
        return Config.LOST_REPORTS_GDRIVE_FOLDER_URL
    return Config.FOUND_REPORTS_GDRIVE_FOLDER_URL


@contextmanager
def _sift_db_context(db_file: str):
    original_db_file = sift.DB_FILE
    with _DB_FILE_SWITCH_LOCK:
        sift.DB_FILE = db_file
        try:
            yield
        finally:
            sift.DB_FILE = original_db_file


def _run_sift_job(job_name: str, func, *args, **kwargs):
    """
    Queue a SIFT job on a bounded worker pool.

    This provides basic load balancing for concurrent users:
    - bounded queue depth (backpressure)
    - fixed worker pool (controlled CPU usage)
    - configurable wait and execution timeout
    """
    acquired = _SIFT_QUEUE_SEMAPHORE.acquire(timeout=_SIFT_JOB_WAIT_TIMEOUT_SECONDS)
    if not acquired:
        raise RuntimeError(
            "SIFT busy: queue is full. Try again shortly. "
            f"(workers={_SIFT_WORKER_POOL_SIZE}, queue_max={_SIFT_QUEUE_MAX_SIZE}, "
            f"wait_timeout={_SIFT_JOB_WAIT_TIMEOUT_SECONDS}s, job={job_name})"
        )

    try:
        future = _SIFT_JOB_EXECUTOR.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=_SIFT_JOB_EXEC_TIMEOUT_SECONDS)
        except FuturesTimeoutError:
            future.cancel()
            raise RuntimeError(
                f"SIFT job timeout after {_SIFT_JOB_EXEC_TIMEOUT_SECONDS}s (job={job_name})"
            )
    finally:
        _SIFT_QUEUE_SEMAPHORE.release()


def _ensure_trained_database(target_status: str, auto_build: bool = True):
    """
    Load status-specific database.
    
    Args:
        target_status: 'lost' or 'found'
        auto_build: If True, auto-rebuild from Drive if missing/corrupt (manual retraining)
                    If False, only load existing DB, no auto-build (during report submission)
    
    Returns:
        (database, db_file) tuple or (None, db_file) if auto_build=False and DB missing
    """
    db_file = _db_file_for_target_status(target_status)
    _log(f"[DB LOAD] status={target_status} db={db_file} auto_build={auto_build}")

    with _sift_db_context(db_file):
        if os.path.exists(db_file):
            _log(f"[DB LOAD] existing db file: {db_file}")
            database = sift.load_database()
            if database is not None:
                _log(f"[DB LOAD] loaded entries={len(database)} status={target_status}")
                if len(database) > 0 and target_status in _AUTO_BUILD_EMPTY_ATTEMPTS:
                    _AUTO_BUILD_EMPTY_ATTEMPTS.discard(target_status)
                return database, db_file
        else:
            _log(f"[DB LOAD] db file missing: {db_file}")

        # File missing or corrupt
        if not auto_build:
            _log(f"[DB LOAD] auto_build disabled for status={target_status}")
            return None, db_file

        if target_status in _AUTO_BUILD_EMPTY_ATTEMPTS:
            _log(f"[DB TRAIN] skipping repeated empty auto-build for status={target_status}")
            return None, db_file

        # Auto-build only if explicitly enabled
        folder_url = _folder_url_for_target_status(target_status)
        _log(f"[DB TRAIN] training status={target_status} from={folder_url}")
        database = sift.build_database_from_gdrive(folder_url)
        _log(f"[DB TRAIN] completed status={target_status} entries={len(database) if database else 0}")
        if not database:
            _AUTO_BUILD_EMPTY_ATTEMPTS.add(target_status)
        return database, db_file

def train_model(gdrive_url):
    def _job():
        database = sift.load_database()
        if database:
            _log("[DB TRAIN] existing database will be overwritten", force=True)

        result = sift.build_database_from_gdrive(gdrive_url)

        # Return JSON-serializable response (not the raw database)
        return {
            "success": True,
            "message": "Training completed successfully",
            "images_processed": len(result),
            "database_location": sift.DB_FILE
        }

    return _run_sift_job('train_model', _job)


def retrain_model_for_status(report_status: str):
    """Rebuild a specific status dataset DB from its mapped Drive folder."""
    normalized_status = (report_status or '').strip().lower()
    if normalized_status not in ('lost', 'found'):
        return {
            "success": False,
            "error": "status must be either 'lost' or 'found'"
        }

    db_file = _db_file_for_target_status(normalized_status)
    folder_url = _folder_url_for_target_status(normalized_status)

    def _job():
        try:
            with _sift_db_context(db_file):
                result = sift.build_database_from_gdrive(folder_url)
            return {
                "success": True,
                "status": normalized_status,
                "images_processed": len(result),
                "database_location": db_file,
                "source_folder": folder_url,
            }
        except Exception as e:
            return {
                "success": False,
                "status": normalized_status,
                "error": str(e),
            }

    return _run_sift_job(f'retrain_{normalized_status}', _job)

def process_image(image_url):
    GDRIVE_FOLDER_ID = DEFAULT_GDRIVE_OUTPUT_FOLDER_ID

    def _job():
        database = sift.load_database()

        if not database:
            return {"error": "Database not found. Please train the model first."}

        return sift.detect_from_database(image_url, database, GDRIVE_FOLDER_ID)

    try:
        result = _run_sift_job('process_image', _job)
    except RuntimeError as e:
        return {
            "success": False,
            "error": str(e),
        }
    
    # Convert to clean JSON response
    json_result = {
        "success": result.get('success', False),
        
        # QUERY IMAGE (the one being processed/uploaded)
        "query_image": {
            "original_source": result['query_image']['original_source'],
            "source_type": result['query_image']['source_type'],
            "saved_to_gdrive": result['query_image']['saved_to_gdrive'],
            "gdrive_file_id": result['query_image']['gdrive_file_id'],
            "gdrive_view_link": result['query_image']['gdrive_view_link']
        },
        
        # MATCHED IMAGE (from database)
        "matched_image": {
            "name": result['matched_image']['name'],
            "match_score": int(result.get('match_score', 0)),
            "source_url": result['matched_image']['source_url'],
            "source_type": result['matched_image']['source_type'],
            "gdrive_file_id": result['matched_image']['gdrive_file_id'],
            "gdrive_view_link": result['matched_image']['gdrive_view_link']
        },
        
        # All potential matches
        "all_matches": [
            {
                "name": m['name'],
                "score": int(m['score']),
                "source_url": m['source_url'],
                "source_type": m['source_type'],
                "gdrive_view_link": m.get('gdrive_view_link')
            }
            for m in result.get('all_matches', [])
        ],
        
        "error": result.get('error')
    }
    
    _log(
        f"[PROCESS RESULT] success={json_result['success']} "
        f"match={json_result['matched_image'].get('name')} "
        f"score={json_result['matched_image'].get('match_score')}"
    )
    
    return json_result


def process_image_for_report(image_url, report_status):
    """
    Cross-match reports by status:
    - found report -> match against lost DB
    - lost report -> match against found DB

    If the required target DB is missing/corrupt, auto-build it from the
    mapped Drive folder so image-based report submissions can still match.
    Saves match visualization to match-results Drive folder.
    
    Returns organized match results with proper error handling.
    """
    _log("[MATCH] starting image matching workflow")
    
    normalized_status = (report_status or '').strip().lower()
    _log(f"[MATCH] report status={normalized_status}")
    
    if normalized_status not in ('lost', 'found'):
        return {
            "success": False,
            "error": f"Invalid report status: {normalized_status}. Must be 'lost' or 'found'"
        }

    target_status = 'lost' if normalized_status == 'found' else 'found'
    _log(f"[MATCH] target status={target_status}")

    try:
        def _job():
            # Auto-build target DB only when missing/corrupt
            try:
                database, db_file = _ensure_trained_database(target_status, auto_build=True)
            except Exception as db_e:
                _log(f"[MATCH ERROR] database loading failed: {db_e}", force=True)
                return {
                    "success": False,
                    "error": f"Database error: {db_e}"
                }
            
            if not database:
                _log(f"[MATCH ERROR] {target_status} database not available", force=True)
                return {
                    "success": False,
                    "error": f"No {target_status} database available for matching. Admin needs to retrain."
                }

            _log(f"[MATCH] database ready with {len(database)} items")
            
            # Ensure match results folder exists (create if missing)
            output_folder_id = _ensure_folder_ready(
                Config.MATCH_RESULTS_GDRIVE_FOLDER_URL, 
                "Match Results"
            ) or DEFAULT_GDRIVE_OUTPUT_FOLDER_ID
            _log(f"[MATCH] result folder={output_folder_id}")

            try:
                result = sift.detect_from_database(image_url, database, output_folder_id)
            except Exception as detect_e:
                _log(f"[MATCH ERROR] detection failed: {detect_e}", force=True)
                return {
                    "success": False,
                    "error": f"Matching failed: {detect_e}"
                }
            
            # If match found, copy to public folder for sharing
            public_copy = {"success": False, "error": "No match to share"}
            if result.get('success'):
                _log("[MATCH] match found; copying to public folder")
                public_copy = copy_matched_image_to_public_folder(result)
            
            return result, public_copy, db_file

        result, public_copy, db_file = _run_sift_job(f'process_report_{target_status}', _job)
        
    except RuntimeError as e:
        error_msg = f"SIFT job error: {e}"
        _log(f"[MATCH ERROR] {error_msg}", force=True)
        return {
            "success": False,
            "error": error_msg
        }
    except Exception as e:
        error_msg = f"Unexpected error during matching: {e}"
        _log(f"[MATCH ERROR] {error_msg}", force=True)
        return {
            "success": False,
            "error": error_msg
        }

    # Build JSON response with all match details
    json_result = {
        "success": result.get('success', False),
        "target_status": target_status,
        "database_file": db_file,
        "query_image": {
            "original_source": result.get('query_image', {}).get('original_source', 'unknown'),
            "source_type": result.get('query_image', {}).get('source_type', 'unknown'),
            "saved_to_gdrive": result.get('query_image', {}).get('saved_to_gdrive', False),
            "gdrive_file_id": result.get('query_image', {}).get('gdrive_file_id'),
            "gdrive_view_link": result.get('query_image', {}).get('gdrive_view_link')
        },
        "matched_image": {
            "name": result.get('matched_image', {}).get('name'),
            "match_score": int(result.get('match_score', 0)),
            "source_url": result.get('matched_image', {}).get('source_url'),
            "source_type": result.get('matched_image', {}).get('source_type', 'unknown'),
            "gdrive_file_id": result.get('matched_image', {}).get('gdrive_file_id'),
            "gdrive_view_link": result.get('matched_image', {}).get('gdrive_view_link')
        },
        "all_matches": [
            {
                "name": m['name'],
                "score": int(m['score']),
                "source_url": m['source_url'],
                "source_type": m['source_type'],
                "gdrive_view_link": m.get('gdrive_view_link')
            }
            for m in result.get('all_matches', [])
        ],
        "public_copy": public_copy,
        "error": result.get('error')
    }

    _log(
        f"[MATCH RESULT] success={json_result['success']} "
        f"score={json_result['matched_image'].get('match_score')} "
        f"public_copy={public_copy.get('success')}"
    )
    
    return json_result


def upload_report_image_by_status(image_source, report_status, filename_prefix="report_upload"):
    """
    Upload report image to status-specific Drive folder with error handling.
    Automatically creates folder if it doesn't exist.
    
    Args:
        image_source: Path/URL/GDrive link to image
        report_status: 'lost' or 'found'
        filename_prefix: Prefix for uploaded filename
        
    Returns:
        Dict with upload result and metadata
    """
    normalized_status = (report_status or '').strip().lower()
    if normalized_status not in ('lost', 'found'):
        sift.log_audit_event(
            'report_upload_error',
            report_status=normalized_status,
            error='invalid_status',
        )
        return {
            "success": False,
            "error": f"Invalid report status: {normalized_status}. Must be 'lost' or 'found'"
        }
    
    # Select correct folder for status
    folder_url = (
        Config.LOST_REPORTS_GDRIVE_FOLDER_URL 
        if normalized_status == 'lost' 
        else Config.FOUND_REPORTS_GDRIVE_FOLDER_URL
    )
    folder_name = f"{normalized_status.upper()} Reports"
    
    # Ensure folder exists (create if missing)
    folder_id = _ensure_folder_ready(folder_url, folder_name)
    if not folder_id:
        sift.log_audit_event(
            'report_upload_error',
            report_status=normalized_status,
            error='folder_unavailable',
            folder_name=folder_name,
        )
        return {
            "success": False,
            "error": f"Could not access or create {folder_name} folder"
        }
    
    _log(f"[UPLOAD] status={normalized_status} folder={folder_id}")
    
    result = upload_image_to_gdrive(
        image_source, 
        filename_prefix=f"{normalized_status}_{filename_prefix}",
        folder_id=folder_id,
        max_retries=3
    )
    
    if result.get('success'):
        _log(f"[UPLOAD] success name={result.get('name')}")
        sift.log_audit_event(
            'report_upload_saved',
            report_status=normalized_status,
            folder_id=folder_id,
            file_id=result.get('gdrive_file_id'),
            filename=result.get('name'),
        )
    else:
        _log(f"[UPLOAD] failed: {result.get('error')}", force=True)
        sift.log_audit_event(
            'report_upload_error',
            report_status=normalized_status,
            folder_id=folder_id,
            error=result.get('error'),
        )
    
    return result


def upload_manual_claim_image(image_source, filename_prefix="manual_claim"):
    """
    Upload manual claim proof image to dedicated claims folder with error handling.
    Automatically creates folder if it doesn't exist.
    
    Args:
        image_source: Path/URL/GDrive link to image
        filename_prefix: Prefix for uploaded filename
        
    Returns:
        Dict with upload result and metadata
    """
    folder_url = Config.MANUAL_CLAIMS_GDRIVE_FOLDER_URL
    folder_name = "Manual Claims"
    
    # Ensure folder exists (create if missing)
    folder_id = _ensure_folder_ready(folder_url, folder_name)
    if not folder_id:
        sift.log_audit_event(
            'manual_claim_upload_error',
            error='folder_unavailable',
            folder_name=folder_name,
        )
        return {
            "success": False,
            "error": "Could not access or create Manual Claims folder"
        }
    
    _log(f"[CLAIM] upload folder={folder_id}")
    
    result = upload_image_to_gdrive(
        image_source, 
        filename_prefix=filename_prefix,
        folder_id=folder_id,
        max_retries=3
    )
    
    if result.get('success'):
        _log(f"[CLAIM] success name={result.get('name')}")
        sift.log_audit_event(
            'manual_claim_upload_saved',
            folder_id=folder_id,
            file_id=result.get('gdrive_file_id'),
            filename=result.get('name'),
        )
    else:
        _log(f"[CLAIM] failed: {result.get('error')}", force=True)
        sift.log_audit_event(
            'manual_claim_upload_error',
            folder_id=folder_id,
            error=result.get('error'),
        )
    
    return result


def copy_matched_image_to_public_folder(result_payload):
    """
    Copy matched database image to public-view folder for external viewing.
    Automatically creates folder if it doesn't exist.
    
    This enables sharing match results without exposing private folder structure.
    """
    matched = (result_payload or {}).get('matched_image') or {}
    matched_file_id = matched.get('gdrive_file_id')
    
    # Ensure public folder exists (create if missing)
    public_folder_id = _ensure_folder_ready(
        Config.PUBLIC_VIEW_GDRIVE_FOLDER_URL,
        "Public View"
    )

    if not matched_file_id:
        _log("[PUBLIC] missing matched image file id", force=True)
        sift.log_audit_event('public_copy_error', error='missing_matched_file_id')
        return {
            "success": False,
            "error": "Matched image has no Google Drive file id"
        }
    
    if not public_folder_id:
        _log("[PUBLIC] invalid or inaccessible public-view folder", force=True)
        sift.log_audit_event('public_copy_error', error='folder_unavailable')
        return {
            "success": False,
            "error": "Could not access or create public-view Drive folder"
        }

    try:
        service = sift.get_drive_service()
        
        _log(f"[PUBLIC] copying file={matched_file_id} to folder={public_folder_id}")
        
        copied_file = service.files().copy(
            fileId=matched_file_id,
            body={
                'name': f"public_{matched.get('name') or 'matched_image'}",
                'parents': [public_folder_id],
            },
            fields='id, name, webViewLink',
        ).execute()
        
        if not copied_file.get('id'):
            raise Exception("Copy operation returned no file ID")

        # Attempt to set public read permissions
        try:
            service.permissions().create(
                fileId=copied_file.get('id'),
                body={'type': 'anyone', 'role': 'reader'},
            ).execute()
            _log(f"[PUBLIC] public permissions set name={copied_file.get('name')}")
        except Exception as perm_e:
            _log(f"[PUBLIC] permission warning: {perm_e}", force=True)
            # Non-critical - continue anyway

        _log(f"[PUBLIC] copied name={copied_file.get('name')}")
        sift.log_audit_event(
            'public_copy_saved',
            source_file_id=matched_file_id,
            folder_id=public_folder_id,
            file_id=copied_file.get('id'),
            filename=copied_file.get('name'),
        )
        
        return {
            "success": True,
            "gdrive_file_id": copied_file.get('id'),
            "gdrive_view_link": copied_file.get('webViewLink'),
            "name": copied_file.get('name'),
        }
        
    except Exception as e:
        error_msg = f"Failed to copy to public folder: {e}"
        _log(f"[PUBLIC] {error_msg}", force=True)
        sift.log_audit_event(
            'public_copy_error',
            source_file_id=matched_file_id,
            folder_id=public_folder_id,
            error=error_msg,
        )
        return {
            "success": False,
            "error": error_msg
        }


def upload_image_to_gdrive(image_source, filename_prefix="report_upload", folder_id=DEFAULT_GDRIVE_OUTPUT_FOLDER_ID, max_retries=3):
    """
    Upload image source (local path/url/gdrive link) to Google Drive and return upload metadata.
    
    Args:
        image_source: Path/URL/GDrive link to image
        filename_prefix: Prefix for the uploaded filename
        folder_id: Target Google Drive folder ID
        max_retries: Number of retry attempts for failed uploads
        
    Returns:
        Dict with success status and file metadata or error details
    """
    if not folder_id:
        sift.log_audit_event(
            'gdrive_upload_wrapper_error',
            filename_prefix=filename_prefix,
            reason='invalid_folder_id',
        )
        return {
            "success": False,
            "error": "Invalid folder ID provided for upload"
        }
    
    retry_count = 0
    last_error = None
    
    while retry_count < max_retries:
        try:
            # Load and prepare image
            try:
                image_array, source_type = sift.load_image_from_source(image_source)
            except Exception as load_e:
                sift.log_audit_event(
                    'gdrive_upload_wrapper_error',
                    filename_prefix=filename_prefix,
                    folder_id=folder_id,
                    reason='load_failed',
                    error=str(load_e),
                )
                return {
                    "success": False,
                    "error": f"Failed to load image: {load_e}"
                }
            
            # Upload to Google Drive
            upload_result = sift.save_image_to_gdrive(
                image_array,
                f"{filename_prefix}.jpg",
                folder_id,
                add_timestamp=True,
                max_retries=2
            )
            
            if upload_result.get('success'):
                sift.log_audit_event(
                    'gdrive_upload_wrapper_saved',
                    filename_prefix=filename_prefix,
                    folder_id=folder_id,
                    file_id=upload_result.get('id'),
                    filename=upload_result.get('name'),
                    source_type=source_type,
                )
                return {
                    "success": True,
                    "gdrive_file_id": upload_result.get('id'),
                    "gdrive_view_link": upload_result.get('view_link'),
                    "name": upload_result.get('name'),
                    "mime_type": upload_result.get('mime_type'),
                    "source_type": source_type
                }
            else:
                last_error = upload_result.get('error', 'Unknown upload error')
                retry_count += 1
                if retry_count < max_retries:
                    import time
                    time.sleep(1 * retry_count)  # Exponential backoff
                    sift.log_audit_event(
                        'gdrive_upload_wrapper_retry',
                        filename_prefix=filename_prefix,
                        folder_id=folder_id,
                        attempt=retry_count,
                        error=last_error,
                    )
                    continue
                else:
                    sift.log_audit_event(
                        'gdrive_upload_wrapper_error',
                        filename_prefix=filename_prefix,
                        folder_id=folder_id,
                        reason='max_retries_reached',
                        error=last_error,
                    )
                    return {
                        "success": False,
                        "error": f"Upload failed after {max_retries} attempts: {last_error}"
                    }
        
        except Exception as e:
            last_error = str(e)
            retry_count += 1
            if retry_count < max_retries:
                import time
                time.sleep(1 * retry_count)
                sift.log_audit_event(
                    'gdrive_upload_wrapper_retry',
                    filename_prefix=filename_prefix,
                    folder_id=folder_id,
                    attempt=retry_count,
                    error=last_error,
                )
                continue
            else:
                sift.log_audit_event(
                    'gdrive_upload_wrapper_error',
                    filename_prefix=filename_prefix,
                    folder_id=folder_id,
                    reason='exception',
                    error=last_error,
                )
                return {
                    "success": False,
                    "error": f"Upload exception after {max_retries} attempts: {last_error}"
                }


def _extract_gdrive_file_id(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return sift.extract_gdrive_file_id(value)


def _prune_sift_database_file(db_file: str, file_ids: Set[str]) -> int:
    if not file_ids or not os.path.exists(db_file):
        return 0

    try:
        with open(db_file, 'rb') as handle:
            database = pickle.load(handle)
    except Exception:
        return 0

    if not isinstance(database, list):
        return 0

    kept_entries = []
    removed_count = 0
    for entry in database:
        if isinstance(entry, dict):
            gdrive_file_id = entry.get('gdrive_file_id')
            source_url = entry.get('source_url') or ''
            matched = bool(gdrive_file_id and gdrive_file_id in file_ids)
            if not matched and source_url:
                matched = any(file_id in source_url for file_id in file_ids)
            if matched:
                removed_count += 1
                continue
        kept_entries.append(entry)

    if removed_count > 0:
        with open(db_file, 'wb') as handle:
            pickle.dump(kept_entries, handle)

    return removed_count


def _extract_file_ids(image_sources: Iterable[Optional[str]]) -> Set[str]:
    return {
        file_id
        for file_id in (_extract_gdrive_file_id(value) for value in image_sources if value)
        if file_id
    }


def _move_files_to_folder(service, file_ids: Set[str], folder_id: Optional[str], label: str):
    if not file_ids:
        return 0, []
    if not folder_id:
        return 0, [{"scope": label, "status": "failed", "error": f"Invalid {label} folder id"}]

    moved = 0
    details = []
    for file_id in file_ids:
        try:
            file_metadata = service.files().get(fileId=file_id, fields='id, name, parents').execute()
            previous_parents = ','.join(file_metadata.get('parents', []))
            service.files().update(
                fileId=file_id,
                addParents=folder_id,
                removeParents=previous_parents,
                fields='id, name, parents',
            ).execute()
            moved += 1
            details.append({
                "scope": label,
                "file_id": file_id,
                "name": file_metadata.get('name'),
                "status": "moved",
            })
        except Exception as exc:
            details.append({
                "scope": label,
                "file_id": file_id,
                "status": "failed",
                "error": str(exc),
            })

    return moved, details


def archive_returned_item_images(
    lost_image_sources: Iterable[Optional[str]] = (),
    found_image_sources: Iterable[Optional[str]] = (),
):
    """
    Move returned images to separate lost/found archive folders and
    remove their entries from the corresponding SIFT status databases.
    """
    lost_file_ids = _extract_file_ids(lost_image_sources)
    found_file_ids = _extract_file_ids(found_image_sources)

    if not lost_file_ids and not found_file_ids:
        return {
            "success": True,
            "moved_files": 0,
            "removed_db_entries": 0,
            "details": [],
        }

    service = sift.get_drive_service()

    lost_folder_id = _extract_folder_id(Config.LOST_RETURNED_GDRIVE_FOLDER_URL)
    found_folder_id = _extract_folder_id(Config.FOUND_RETURNED_GDRIVE_FOLDER_URL)

    moved_lost, lost_details = _move_files_to_folder(service, lost_file_ids, lost_folder_id, 'lost_returned')
    moved_found, found_details = _move_files_to_folder(service, found_file_ids, found_folder_id, 'found_returned')

    removed_db_entries = 0
    removed_db_entries += _prune_sift_database_file(LOST_DB_FILE, lost_file_ids)
    removed_db_entries += _prune_sift_database_file(FOUND_DB_FILE, found_file_ids)

    return {
        "success": True,
        "moved_files": moved_lost + moved_found,
        "removed_db_entries": removed_db_entries,
        "details": lost_details + found_details,
    }