import sift.algorithm as sift
import os
import pickle
import re
from typing import Optional, Iterable, Set
from core.config import Config


DEFAULT_GDRIVE_OUTPUT_FOLDER_ID = "1qtyquqQntdIu9FU8nnu-cmWkL6Lt1oXm"

SIFT_DB_DIR = os.path.join(os.path.dirname(sift.DB_FILE), 'databases')
os.makedirs(SIFT_DB_DIR, exist_ok=True)

LOST_DB_FILE = os.path.join(SIFT_DB_DIR, 'lost_reports_sift_database.pkl')
FOUND_DB_FILE = os.path.join(SIFT_DB_DIR, 'found_reports_sift_database.pkl')


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


def _ensure_trained_database(target_status: str):
    """Ensure status-specific DB exists; train from mapped Drive folder if missing/corrupt."""
    db_file = _db_file_for_target_status(target_status)
    original_db_file = sift.DB_FILE
    try:
        sift.DB_FILE = db_file
        database = sift.load_database()
        if database:
            return database, db_file

        folder_url = _folder_url_for_target_status(target_status)
        print(f"Training {target_status} database from: {folder_url}")
        database = sift.build_database_from_gdrive(folder_url)
        return database, db_file
    finally:
        sift.DB_FILE = original_db_file

def train_model(gdrive_url):
    database = sift.load_database()
    if database:
        print("⚠️ Database already exists. Training will overwrite the existing database.")
    
    result = sift.build_database_from_gdrive(gdrive_url)
    
    # Return JSON-serializable response (not the raw database)
    return {
        "success": True,
        "message": "Training completed successfully",
        "images_processed": len(result),
        "database_location": sift.DB_FILE
    }


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

    original_db_file = sift.DB_FILE
    try:
        sift.DB_FILE = db_file
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
    finally:
        sift.DB_FILE = original_db_file

def process_image(image_url):
    GDRIVE_FOLDER_ID = DEFAULT_GDRIVE_OUTPUT_FOLDER_ID

    database = sift.load_database()

    if not database:
        return {"error": "Database not found. Please train the model first."}
    
    result = sift.detect_from_database(image_url, database, GDRIVE_FOLDER_ID)
    
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
    
    # Print summary
    print(f"\nRESULT SUMMARY:")
    print(f"   Success: {json_result['success']}")
    print(f"\n   QUERY IMAGE:")
    print(f"      Source: {json_result['query_image']['original_source'][:60]}...")
    print(f"      Type: {json_result['query_image']['source_type']}")
    print(f"      Saved to GDrive: {json_result['query_image']['saved_to_gdrive']}")
    if json_result['query_image'].get('gdrive_view_link'):
        print(f"      View Link: {json_result['query_image']['gdrive_view_link']}")
    
    print(f"\n   MATCHED IMAGE:")
    print(f"      Name: {json_result['matched_image']['name']}")
    print(f"      Score: {json_result['matched_image']['match_score']}")
    print(f"      Source URL: {json_result['matched_image'].get('source_url', 'N/A')}")
    print(f"      Source Type: {json_result['matched_image'].get('source_type', 'N/A')}")
    if json_result['matched_image'].get('gdrive_view_link'):
        print(f"      GDrive Link: {json_result['matched_image']['gdrive_view_link']}")
    
    return json_result


def process_image_for_report(image_url, report_status):
    """
    Cross-match reports by status:
    - found report -> match against lost DB
    - lost report -> match against found DB
    Saves match visualization to match-results Drive folder.
    """
    normalized_status = (report_status or '').strip().lower()
    target_status = 'lost' if normalized_status == 'found' else 'found'

    database, db_file = _ensure_trained_database(target_status)
    if not database:
        return {
            "success": False,
            "error": f"No {target_status} database available for matching"
        }

    output_folder_id = _extract_folder_id(Config.MATCH_RESULTS_GDRIVE_FOLDER_URL) or DEFAULT_GDRIVE_OUTPUT_FOLDER_ID

    result = sift.detect_from_database(image_url, database, output_folder_id)
    public_copy = {"success": False}
    if result.get('success'):
        public_copy = copy_matched_image_to_public_folder(result)

    json_result = {
        "success": result.get('success', False),
        "target_status": target_status,
        "database_file": db_file,
        "query_image": {
            "original_source": result['query_image']['original_source'],
            "source_type": result['query_image']['source_type'],
            "saved_to_gdrive": result['query_image']['saved_to_gdrive'],
            "gdrive_file_id": result['query_image']['gdrive_file_id'],
            "gdrive_view_link": result['query_image']['gdrive_view_link']
        },
        "matched_image": {
            "name": result['matched_image']['name'],
            "match_score": int(result.get('match_score', 0)),
            "source_url": result['matched_image']['source_url'],
            "source_type": result['matched_image']['source_type'],
            "gdrive_file_id": result['matched_image']['gdrive_file_id'],
            "gdrive_view_link": result['matched_image']['gdrive_view_link']
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

    return json_result


def upload_report_image_by_status(image_source, report_status, filename_prefix="report_upload"):
    """Upload report image to status-specific Drive folder."""
    normalized_status = (report_status or '').strip().lower()
    folder_url = Config.LOST_REPORTS_GDRIVE_FOLDER_URL if normalized_status == 'lost' else Config.FOUND_REPORTS_GDRIVE_FOLDER_URL
    folder_id = _extract_folder_id(folder_url)
    if not folder_id:
        return {
            "success": False,
            "error": f"Invalid folder mapping for status '{normalized_status}'"
        }
    return upload_image_to_gdrive(image_source, filename_prefix=filename_prefix, folder_id=folder_id)


def upload_manual_claim_image(image_source, filename_prefix="manual_claim"):
    """Upload manual claim proof image to dedicated claims folder."""
    folder_id = _extract_folder_id(Config.MANUAL_CLAIMS_GDRIVE_FOLDER_URL)
    if not folder_id:
        return {
            "success": False,
            "error": "Invalid manual claims Drive folder"
        }
    return upload_image_to_gdrive(image_source, filename_prefix=filename_prefix, folder_id=folder_id)


def copy_matched_image_to_public_folder(result_payload):
    """Copy matched database image to public-view folder for external viewing."""
    matched = (result_payload or {}).get('matched_image') or {}
    matched_file_id = matched.get('gdrive_file_id')
    public_folder_id = _extract_folder_id(Config.PUBLIC_VIEW_GDRIVE_FOLDER_URL)

    if not matched_file_id:
        return {
            "success": False,
            "error": "Matched image has no Google Drive file id"
        }
    if not public_folder_id:
        return {
            "success": False,
            "error": "Invalid public-view Drive folder"
        }

    try:
        service = sift.get_drive_service()
        copied_file = service.files().copy(
            fileId=matched_file_id,
            body={
                'name': f"public_{matched.get('name') or 'matched_image'}",
                'parents': [public_folder_id],
            },
            fields='id, name, webViewLink',
        ).execute()

        try:
            service.permissions().create(
                fileId=copied_file.get('id'),
                body={'type': 'anyone', 'role': 'reader'},
            ).execute()
        except Exception:
            pass

        return {
            "success": True,
            "gdrive_file_id": copied_file.get('id'),
            "gdrive_view_link": copied_file.get('webViewLink'),
            "name": copied_file.get('name'),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def upload_image_to_gdrive(image_source, filename_prefix="report_upload", folder_id=DEFAULT_GDRIVE_OUTPUT_FOLDER_ID):
    """Upload image source (local path/url/gdrive link) to Google Drive and return upload metadata."""
    try:
        image_array, _ = sift.load_image_from_source(image_source)
        upload_result = sift.save_image_to_gdrive(
            image_array,
            f"{filename_prefix}.jpg",
            folder_id,
            add_timestamp=True,
        )
        if not upload_result.get('success'):
            return {
                "success": False,
                "error": upload_result.get('error', 'Unknown upload error')
            }

        return {
            "success": True,
            "gdrive_file_id": upload_result.get('id'),
            "gdrive_view_link": upload_result.get('view_link'),
            "name": upload_result.get('name'),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
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