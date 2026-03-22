from models.found_items_model import FoundItems
from core.extensions import db
from datetime import datetime, timezone

def get_all_found_items():
    """Get all found items."""
    items = FoundItems.query.all()
    return [item.to_json() for item in items]

def get_pending_found_items():
    """Get all pending found items."""
    items = FoundItems.query.filter_by(status='pending').all()
    return [item.to_json() for item in items]

def get_found_item_by_id(found_item_id):
    """Get a specific found item by ID."""
    item = FoundItems.query.get(found_item_id)
    return item.to_json() if item else None

def create_found_item(finder_name, finder_student_number, finder_contact_info, 
                      item_name, item_description, item_location, category,
                      date_found, image_path=None):
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
        image=image_path
    )
    db.session.add(new_item)
    db.session.commit()
    return new_item.to_json()

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
