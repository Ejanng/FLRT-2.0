from models.reports_model import Reports, db
from models.pending_claims_model import PendingClaims
from sift.services import process_image
from datetime import datetime, timezone

def submit_report(data, image_url=None):
    """Create a new report."""
    new_report = Reports(
        item_name=data.get('item_name'),
        description=data.get('description'),
        status=data.get('status'),
        location=data.get('location'),
        time=data.get('time') or None,
        image=image_url,
        category=data.get('category', 'Uncategorized'),
        date_reported=datetime.now(timezone.utc)
    )
    
    db.session.add(new_report)
    db.session.commit()
    
    return new_report

def get_all_reports():
    """Get all reports for admin dashboard."""
    all_reports = Reports.query.order_by(Reports.date_reported.desc()).all()
    return {
        "reports": [report.to_json() for report in all_reports]
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

def publish_report_to_claims(report_id):
    """Publish a report to make it visible in claim page."""
    report = Reports.query.filter_by(report_id=report_id).first()

    if not report:
        return None, "Report not found"

    # Already published
    if report.status in ('published_lost', 'published_found'):
        return report, None

    # Convert status to published version
    current_status = (report.status or '').strip().lower()
    if current_status == 'lost':
        report.status = 'published_lost'
    elif current_status == 'found':
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

def process_report_with_image_url(image_url, data, new_report):
    """
    Process lost item report image and create pending claim if match found.
    """
    result = process_image(image_url)

    if not result:
        return None, "Image processing failed", "Error"

    if not result.get('success'):
        return None, "No match found in database. Report recorded for manual review.", "No Match"
    
    student_name = data.get('student_name')
    student_number = data.get('student_number')
    contact_info = data.get('contact_info')

    if not student_name or not student_number or not contact_info:
        return None, "Match found but missing required claim information", "Incomplete Data"

    matched_name = result.get("matched_image", {}).get("name")
    matched_source = result.get("matched_image", {}).get("source_url")
    matched_gdrive_id = result.get("matched_image", {}).get("gdrive_file_id")
    match_score = result.get("matched_image", {}).get("match_score", 0)

    print(f"Match found: {matched_name} (Score: {match_score})")
    print(f"Matched image source: {matched_source}")

    report_id = new_report.report_id

    try:
        new_claim = PendingClaims(
            report_id=report_id,
            student_name=data.get('student_name'),
            student_number=data.get('student_number'),
            contact_info=data.get('contact_info'),
            description=data.get('description', ''),
            status='pending',
            image=matched_source or matched_gdrive_id or image_url
        )
        db.session.add(new_claim)
        db.session.commit()
        
        return new_claim, f"Match found ({matched_name}). Pending claim created.", "Approved"
        
    except Exception as e:
        db.session.rollback()
        print(f"Database error creating claim: {e}")
        return None, "Match found but failed to create claim", "Database Error"