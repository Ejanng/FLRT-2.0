from models.found_items_model import FoundItems
from core.extensions import db
from datetime import datetime, timezone

def get_all_found_items():
    """Get all direct found-item submissions (exclude report-linked records)."""
    items = FoundItems.query.filter(FoundItems.report_id.is_(None)).all()
    return [item.to_json() for item in items]

def get_pending_found_items():
    """Get pending direct found-item submissions (exclude report-linked records)."""
    items = FoundItems.query.filter(
        FoundItems.status == 'pending',
        FoundItems.report_id.is_(None)
    ).all()
    return [item.to_json() for item in items]

def get_found_item_by_id(found_item_id):
    """Get a specific found item by ID."""
    item = FoundItems.query.get(found_item_id)
    return item.to_json() if item else None

def create_found_item(finder_name, finder_student_number, finder_contact_info, 
                      item_name, item_description, item_location, category,
                      date_found, image_path=None, report_id=None):
    """Create a new found item submission."""
    new_item = FoundItems(
        finder_name=finder_name,
        finder_student_number=finder_student_number,
        finder_contact_info=finder_contact_info,
        item_name=item_name,
        item_description=item_description,
        item_location=item_location,
        category=category,
        date_found=datetime.fromisoformat(date_found) if isinstance(date_found, str) else date_found,
        status='pending',
        image=image_path,
        report_id=report_id
    )
    db.session.add(new_item)
    db.session.commit()
    return new_item.to_json()

def get_found_item_by_report_id(report_id):
    """Get found item coordination record linked to a report."""
    if not report_id:
        return None
    return FoundItems.query.filter_by(report_id=report_id).first()

def contact_finder_by_report(report_id, admin_notes):
    """Contact finder for a found report by report ID."""
    item = get_found_item_by_report_id(report_id)
    if not item:
        return None

    item.status = 'contacted'
    item.admin_notes = admin_notes
    item.date_contacted = datetime.now(timezone.utc)
    db.session.commit()
    return item.to_json()

def verify_found_item_by_report(report_id, admin_notes=None):
    """Mark found report coordination as verified by report ID."""
    item = get_found_item_by_report_id(report_id)
    if not item:
        return None

    item.status = 'verified'
    if admin_notes:
        item.admin_notes = admin_notes
    if not item.date_contacted:
        item.date_contacted = datetime.now(timezone.utc)
    db.session.commit()
    return item.to_json()

def contact_finder(found_item_id, admin_notes):
    """Mark found item as contacted and store admin notes."""
    item = FoundItems.query.get(found_item_id)
    if not item:
        return None
    
    item.status = 'contacted'
    item.admin_notes = admin_notes
    item.date_contacted = datetime.now(timezone.utc)
    db.session.commit()
    return item.to_json()

def close_found_item(found_item_id, status):
    """Close a found item (mark as returned or cancelled)."""
    item = FoundItems.query.get(found_item_id)
    if not item:
        return None
    
    if status not in ['returned', 'cancelled']:
        return None
    
    item.status = status
    item.date_closed = datetime.now(timezone.utc)
    db.session.commit()
    return item.to_json()
