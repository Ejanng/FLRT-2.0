# 




from models.reports_model import Reports, db
from sift.services import process_image, train_model
from core.config import Config
from models.pending_claims_model import PendingClaims
from datetime import datetime, timezone

def submit_report(data):
    new_report = Reports(
        item_name=data.get('item_name'),
        description=data.get('description'),
        status=data.get('status'),
        location=data.get('location'),
        time=data.get('time'),
        image=data.get('image'),
        date_reported=datetime.now(timezone.utc)
    )
    db.session.add(new_report)
    db.session.commit()

    return new_report

def get_all_reports():
    all_reports = Reports.query.all()

    return {
        "reports": [report.to_json() for report in all_reports]
    }


# def publish_report_to_claims(report_id):
#     report = Reports.query.filter_by(report_id=report_id).first()

#     if not report:
#         return None, "Report not found"

#     if report.status in ('published', 'published_lost', 'published_found'):
#         return report, None


#     current_status = (report.status or '').strip().lower()
#     if current_status == 'lost':
#         report.status = 'published_lost'
#     elif current_status == 'found':
#         report.status = 'published_found'
#     else:
#         report.status = 'published_found'

#     db.session.commit()

#     return report, None

def process_report_with_image_url(image_url, data, new_report):
    """
    Process lost item report image and create pending claim if match found.
    
    Args:
        image_url: URL of the uploaded image
        data: Report form data
        new_report: The report object just created in database
    
    Returns:
        tuple: (claim_object or None, message_string, status_string)
    """

    print(f"DEBUG: Starting process_report_with_image_url")
    print(f"DEBUG: image_url = {image_url}")
    # Process the image and get the result
    result = process_image(image_url)

    print(f"DEBUG: process_image returned type = {type(result)}")
    print(f"DEBUG: process_image returned = {result}")

    # Check if processing succeeded
    if not result:
        return None, "Image processing failed", "Error"

    # No match found in database
    if not result.get('success'):
        return None, "No match found in database. Report recorded for manual review.", "No Match"

    # Extract match information
    matched_name = result.get("matched_image", {}).get("name")
    matched_source = result.get("matched_image", {}).get("source_url")
    matched_gdrive_id = result.get("matched_image", {}).get("gdrive_file_id")
    match_score = result.get("matched_image", {}).get("match_score", 0)

    # Log match details
    print(f"Match found: {matched_name} (Score: {match_score})")
    print(f"Matched image source: {matched_source}")

    # Use the report_id from the newly created report
    report_id = new_report.report_id

    # Create pending claim
    try:
        new_claim = PendingClaims(
            report_id=report_id,
            student_name=data.get('student_name'),
            student_number=data.get('student_number'),
            contact_info=data.get('contact_info'),
            description=data.get('description'),
            status='pending',
            image=matched_source or matched_gdrive_id or image_url  # Fallback chain
        )
        db.session.add(new_claim)
        db.session.commit()
        
        return new_claim, f"Match found ({matched_name}). Pending claim created.", "Approved"
        
    except Exception as e:
        db.session.rollback()
        print(f"Database error creating claim: {e}")
        return None, "Match found but failed to create claim", "Database Error"


# def train_model_upon_report(image_url, report):
#     """Train SIFT database with new found item image"""
#     try:
#         # Add to database with metadata
#         database = sift.load_database()
        
#         # Load and process image
#         img, source_type = sift.load_image_from_source(image_url)
        
#         if img is None:
#             return {"success": False, "error": "Could not load image"}
        
#         # Extract features and add to database
#         success = sift.extract_and_save_features_enhanced(
#             img, 
#             f"report_{report.report_id}_{report.item_name}.jpg",
#             database,
#             source_url=image_url,
#             is_array=True
#         )
        
#         if success:
#             # Save updated database
#             with open(sift.DB_FILE, 'wb') as f:
#                 pickle.dump(database, f)
#             return {"success": True, "message": "Image added to database"}
#         else:
#             return {"success": False, "error": "Feature extraction failed"}
            
#     except Exception as e:
#         return {"success": False, "error": str(e)}

# def get_claimable_reports():
#     claimable_reports = Reports.query.filter(
#         Reports.status.in_(['published', 'published_lost', 'published_found'])
#     ).all()

#     mapped_reports = []
#     for report in claimable_reports:
#         payload = report.to_json()
#         status = (report.status or '').strip().lower()
#         if status == 'published_lost':
#             payload['status'] = 'lost'
#         else:
#             payload['status'] = 'found'
#         mapped_reports.append(payload)

#     return {
#         "reports": mapped_reports
#     }



    