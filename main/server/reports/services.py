from models.reports_model import Reports, db
from models.pending_claims_model import PendingClaims
from models.found_items_model import FoundItems
from sift.services import process_image_for_report, archive_returned_item_images
from datetime import datetime, timezone, date


def _is_sift_busy_error(error_text: str) -> bool:
    normalized = (error_text or '').strip().lower()
    if not normalized:
        return False

    return (
        'sift busy:' in normalized
        or 'queue is full' in normalized
        or 'job timeout' in normalized
    )


def _parse_iso_date(raw_value):
    if not raw_value:
        return None
    try:
        value = str(raw_value).strip()
        if not value:
            return None
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None

def submit_report(data, image_url=None):
    """Create a new report."""
    final_image_url = image_url or data.get('image')
    status = (data.get('status') or '').strip().lower()
    date_lost_input = data.get('date_lost') or data.get('date')
    date_lost = _parse_iso_date(date_lost_input) if status == 'lost' else None
    date_reported = datetime.now(timezone.utc)
    
    new_report = Reports(
        item_name=data.get('item_name'),
        description=data.get('description'),
        status=data.get('status'),
        location=data.get('location'),
        time=data.get('time') or None,
        image=final_image_url,
        category=data.get('category', 'Uncategorized'),
        date_reported=date_reported,
        date_lost=date_lost,
    )
    
    db.session.add(new_report)
    db.session.commit()
    
    return new_report

def get_all_reports():
    """Get all reports for admin dashboard."""
    all_reports = Reports.query.order_by(Reports.date_reported.desc()).all()

    report_ids = [report.report_id for report in all_reports]
    found_items = FoundItems.query.filter(FoundItems.report_id.in_(report_ids)).all() if report_ids else []
    found_item_map = {item.report_id: item for item in found_items}
    pending_claims = PendingClaims.query.filter(PendingClaims.report_id.in_(report_ids)).all() if report_ids else []
    claims_by_report = {}
    for claim in pending_claims:
        claims_by_report.setdefault(claim.report_id, []).append(claim)

    formatted_reports = []
    for report in all_reports:
        payload = report.to_json()
        linked_found_item = found_item_map.get(report.report_id)
        report_claims = claims_by_report.get(report.report_id, [])
        linked_pending_claim = next((c for c in report_claims if c.status == 'pending'), None)
        if not linked_pending_claim and report_claims:
            linked_pending_claim = report_claims[0]

        payload['is_found_report'] = (report.status or '').strip().lower() in ('found', 'published_found')
        if linked_found_item:
            payload['finder_name'] = linked_found_item.finder_name
            payload['finder_contact_info'] = linked_found_item.finder_contact_info
            payload['finder_student_number'] = linked_found_item.finder_student_number
            payload['coordination_status'] = linked_found_item.status
            payload['coordination_notes'] = linked_found_item.admin_notes
            payload['coordination_admin_id'] = linked_found_item.admin_id
            payload['date_contacted'] = linked_found_item.date_contacted.isoformat() if linked_found_item.date_contacted else None
        else:
            payload['coordination_status'] = None
            payload['coordination_admin_id'] = None

        payload['public_match_link'] = linked_pending_claim.image if linked_pending_claim else None
        payload['has_pending_claim'] = any(claim.status == 'pending' for claim in report_claims)
        payload['pending_claim_status'] = linked_pending_claim.status if linked_pending_claim else None

        formatted_reports.append(payload)

    return {
        "reports": formatted_reports
    }

def get_claimable_reports():
    """Get published reports for public claim page."""
    claimable_reports = Reports.query.filter(
        Reports.status.in_(['published_lost', 'published_found'])
    ).order_by(Reports.date_reported.desc()).all()

    mapped_reports = []
    for report in claimable_reports:
        payload = report.to_json()
        # Normalize status for frontend
        status = (report.status or '').strip().lower()
        if status == 'published_lost':
            payload['status'] = 'lost'
        else:
            payload['status'] = 'found'
        mapped_reports.append(payload)

    return {
        "reports": mapped_reports
    }

def publish_report_to_claims(report_id, category=None):
    """Publish a report to make it visible in claim page."""
    report = Reports.query.filter_by(report_id=report_id).first()

    if not report:
        return None, "Report not found"

    if category is not None:
        normalized_category = (category or '').strip()
        if not normalized_category:
            return None, "Category is required before publishing"
        report.category = normalized_category

    # Already published
    if report.status in ('published_lost', 'published_found'):
        return report, None

    # Convert status to published version
    current_status = (report.status or '').strip().lower()
    if current_status == 'lost':
        report.status = 'published_lost'
    elif current_status == 'found':
        linked_found_item = FoundItems.query.filter_by(report_id=report_id).first()
        if not linked_found_item:
            return None, "Found report must have a coordination record before publishing"
        if linked_found_item.status != 'verified':
            return None, "Found report must be coordinated and verified with finder before publishing"
        report.status = 'published_found'
    else:
        # Default to published_found if status is unclear
        report.status = 'published_found'

    db.session.commit()
    return report, None

def delete_report(report_id):
    """Delete a report (reject action)."""
    report = Reports.query.filter_by(report_id=report_id).first()
    
    if not report:
        return None, "Report not found"
    
    # Also delete any associated pending claims
    PendingClaims.query.filter_by(report_id=report_id).delete()
    
    db.session.delete(report)
    db.session.commit()
    return report, None

def get_report_by_id(report_id):
    """Get single report by ID."""
    report = Reports.query.get(report_id)
    if not report:
        return None
    return report.to_json()

def update_report_status(report_id, new_status):
    """Update report status."""
    report = Reports.query.get(report_id)
    if not report:
        return None, "Report not found"
    
    report.status = new_status
    db.session.commit()
    return report, None


def _archive_matched_report_images(report_status, report_image, matched_image_source):
    """Move matched report images out of active folders into returned folders."""
    normalized_status = (report_status or '').strip().lower()
    if normalized_status == 'lost':
        return archive_returned_item_images(
            lost_image_sources=[report_image],
            found_image_sources=[matched_image_source],
        )
    if normalized_status == 'found':
        return archive_returned_item_images(
            lost_image_sources=[matched_image_source],
            found_image_sources=[report_image],
        )
    return {
        'success': False,
        'moved_files': 0,
        'removed_db_entries': 0,
        'details': [],
        'error': f'Unsupported report status for archiving: {report_status}',
    }

def process_report_with_image_url(image_url, data, new_report):
    """
    Process lost item report image and create pending claim if match found.
    """
    report_status = data.get('status')
    print(f"[REPORT SERVICE] process_report_with_image_url called for status={report_status}, image_url={image_url}")
    result = process_image_for_report(image_url, report_status)
    print(f"[REPORT SERVICE] process_image_for_report returned: {result}")

    if not result:
        return None, "Image processing failed", "Error", None

    if not result.get('success'):
        error_text = (result.get('error') or '').strip()
        if _is_sift_busy_error(error_text):
            return None, error_text, "Busy", None
        return None, "No match found in database. Report recorded for manual review.", "No Match", None
    
    student_name = data.get('student_name')
    student_number = data.get('student_number')
    contact_info = data.get('contact_info')

    if not student_name or not student_number or not contact_info:
        return None, "Match found but missing required claim information", "Incomplete Data", {
            "matched_image": result.get("matched_image", {}),
            "match_score": int(result.get("match_score", 0)),
            "target_status": result.get("target_status"),
        }

    matched_name = result.get("matched_image", {}).get("name")
    matched_source = result.get("matched_image", {}).get("source_url")
    matched_gdrive_id = result.get("matched_image", {}).get("gdrive_file_id")
    public_copy = result.get("public_copy", {}) or {}
    public_view_link = public_copy.get("gdrive_view_link")
    match_score = result.get("matched_image", {}).get("match_score", 0)

    print(f"Match found: {matched_name} (Score: {match_score})")
    print(f"Matched image source: {matched_source}")

    report_id = new_report.report_id

    try:
        # Route source/matched images into their respective returned folders when a match is approved.
        archive_result = _archive_matched_report_images(report_status, image_url, matched_source)

        if not archive_result.get("success", False):
            print(f"Archive warning: {archive_result}")

        new_claim = PendingClaims(
            report_id=report_id,
            student_name=data.get('student_name'),
            student_number=data.get('student_number'),
            contact_info=data.get('contact_info'),
            description=data.get('description', ''),
            status='pending',
            image=public_view_link or matched_source or matched_gdrive_id or image_url,
            date_claimed=datetime.now(timezone.utc)
        )
        db.session.add(new_claim)
        db.session.commit()
        
        return new_claim, f"Match found ({matched_name}). Pending claim created.", "Approved", None
        
    except Exception as e:
        db.session.rollback()
        print(f"Database error creating claim: {e}")
        return None, "Match found but failed to create claim", "Database Error", None


def create_pending_claim_for_existing_report(report_id, data, matched_image_source=None):
    """Create pending claim for an already-matched report without reprocessing image."""
    report = Reports.query.get(report_id)
    if not report:
        return None, "Report not found"

    student_name = data.get('student_name')
    student_number = data.get('student_number')
    contact_info = data.get('contact_info')

    if not student_name or not student_number or not contact_info:
        return None, "Missing required claim information"

    existing_claim = PendingClaims.query.filter_by(
        report_id=report_id,
        student_number=student_number
    ).first()
    if existing_claim:
        return None, "You have already submitted a claim for this matched report"

    try:
        archive_result = _archive_matched_report_images(report.status, report.image, matched_image_source)
        if not archive_result.get('success', False):
            print(f"Archive warning for existing report: {archive_result}")

        new_claim = PendingClaims(
            report_id=report_id,
            student_name=student_name,
            student_number=student_number,
            contact_info=contact_info,
            description=data.get('description') or report.description or '',
            status='pending',
            image=matched_image_source or report.image,
            date_claimed=datetime.now(timezone.utc)
        )
        db.session.add(new_claim)
        db.session.commit()
        return new_claim, None
    except Exception as e:
        db.session.rollback()
        print(f"Database error creating claim for existing report: {e}")
        return None, "Failed to create pending claim"