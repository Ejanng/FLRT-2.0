from flask import Blueprint, request, jsonify
from models.pending_claims_model import PendingClaims
from models.reports_model import Reports
from models.returns_model import Returns
from models.found_items_model import FoundItems
from core.extensions import db
from datetime import datetime, timezone
from sift.services import upload_manual_claim_image, archive_returned_item_images
from core.notifications import send_discord_notification

claim_bp = Blueprint('claims', __name__)

@claim_bp.route('/submit-claim', methods=['POST'])
def submit_claim():
    """Submit a claim for a published item."""
    try:
        # Handle both JSON and FormData
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form
            image_file = request.files.get('proof_image')
        else:
            data = request.get_json() or {}
            image_file = None
        
        report_id = data.get('report_id') or data.get('itemId')
        student_name = data.get('claimantName') or data.get('student_name')
        student_number = data.get('claimantId') or data.get('student_number')
        contact_info = data.get('claimantEmail') or data.get('contact_info')
        description = data.get('description')
        
        # Handle image upload
        image_url = None
        if image_file and image_file.filename:
            temp_path = f"/tmp/claim_{datetime.now().timestamp()}_{image_file.filename}"
            image_file.save(temp_path)
            upload_result = upload_manual_claim_image(temp_path, filename_prefix='manual_claim_proof')
            if upload_result.get('success'):
                image_url = upload_result.get('gdrive_view_link')
            else:
                image_url = temp_path
        
        # Validate
        if not all([report_id, student_name, student_number, contact_info, description]):
            missing = []
            if not report_id: missing.append('report_id')
            if not student_name: missing.append('student_name')
            if not student_number: missing.append('student_number')
            if not contact_info: missing.append('contact_info')
            if not description: missing.append('description')
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
        
        # Check if report exists and is published
        report = Reports.query.get(int(report_id))
        if not report:
            return jsonify({"error": "Report not found"}), 404
        
        if not report.status.startswith('published'):
            return jsonify({"error": "This item is not available for claiming"}), 400
        
        # Check if claim already exists for this report by this student
        existing = PendingClaims.query.filter_by(
            report_id=int(report_id),
            student_number=student_number
        ).first()
        
        if existing:
            return jsonify({"error": "You have already submitted a claim for this item"}), 400
        
        # Create pending claim
        new_claim = PendingClaims(
            report_id=int(report_id),
            student_name=student_name,
            student_number=student_number,
            contact_info=contact_info,
            description=description,
            status='pending',
            image=image_url
        )
        
        db.session.add(new_claim)
        db.session.commit()

        send_discord_notification(
            title='New Claim Needs Verification',
            description='A new claim is pending admin review. Open Admin Dashboard → Verify Claims.',
            audience='admin',
            fields=[
                {'name': 'Claim ID', 'value': str(new_claim.claim_id), 'inline': True},
                {'name': 'Report ID', 'value': str(new_claim.report_id), 'inline': True},
                {'name': 'Claimant', 'value': student_name or 'N/A', 'inline': False},
            ],
        )

        return jsonify({
            "message": "Claim submitted successfully",
            "claim": new_claim.to_json()
        }), 201
        
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@claim_bp.route('/pending-claims', methods=['GET'])
def get_pending_claims():
    """Get all pending claims for admin review."""
    try:
        claims = PendingClaims.query.filter_by(status='pending').order_by(PendingClaims.date_claimed.desc()).all()
        
        # Include report details
        result = []
        for claim in claims:
            claim_data = claim.to_json()
            report = Reports.query.get(claim.report_id)
            if report:
                claim_data['report'] = {
                    'item_name': report.item_name,
                    'description': report.description,
                    'location': report.location,
                    'image': report.image,
                    'status': report.status,
                }

                found_item = FoundItems.query.filter_by(report_id=report.report_id).first()
                if found_item:
                    claim_data['report']['finder'] = {
                        'name': found_item.finder_name,
                        'student_number': found_item.finder_student_number,
                        'contact_info': found_item.finder_contact_info,
                        'coordination_status': found_item.status,
                    }
            result.append(claim_data)
        
        return jsonify({
            "claims": result
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@claim_bp.route('/all-claims', methods=['GET'])
def get_all_claims():
    """Get all claims (for admin)."""
    try:
        claims = PendingClaims.query.order_by(PendingClaims.date_claimed.desc()).all()
        return jsonify({
            "claims": [claim.to_json() for claim in claims]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@claim_bp.route('/review-claim/<int:claim_id>', methods=['POST'])
def review_claim(claim_id):
    """Approve or reject a claim."""
    try:
        data = request.get_json()
        action = data.get('action')  # 'approve' or 'reject'
        admin_id = data.get('admin_id', 1)  # Default admin ID
        return_announcement = None
        
        claim = PendingClaims.query.get(claim_id)
        if not claim:
            return jsonify({"error": "Claim not found"}), 404
        
        if claim.status != 'pending':
            return jsonify({"error": f"Claim is already {claim.status}"}), 400
        
        if action == 'approve':
            claim.status = 'accepted'
            
            # Update report status to returned with original type
            report = Reports.query.get(claim.report_id)
            original_status = (report.status or '').strip().lower() if report else ''
            if report:
                # Determine return status based on original type
                if original_status in ('found', 'published_found'):
                    report.status = 'returned_found'
                elif original_status in ('lost', 'published_lost'):
                    report.status = 'returned_lost'
                else:
                    report.status = 'returned'  # Fallback

            found_item = FoundItems.query.filter_by(report_id=claim.report_id).first()
            if found_item:
                found_item.status = 'returned'
                found_item.date_closed = datetime.now(timezone.utc)

            lost_images_to_archive = []
            found_images_to_archive = []

            report_image = report.image if report else None
            found_image = found_item.image if found_item else None
            matched_image = claim.image

            if original_status in ('found', 'published_found'):
                if report_image:
                    found_images_to_archive.append(report_image)
                if found_image:
                    found_images_to_archive.append(found_image)
                if matched_image:
                    lost_images_to_archive.append(matched_image)
            elif original_status in ('lost', 'published_lost'):
                if report_image:
                    lost_images_to_archive.append(report_image)
                if found_image:
                    found_images_to_archive.append(found_image)
                if matched_image:
                    found_images_to_archive.append(matched_image)
            else:
                if report_image:
                    lost_images_to_archive.append(report_image)
                if found_image:
                    found_images_to_archive.append(found_image)
                if matched_image:
                    found_images_to_archive.append(matched_image)

            archive_result = archive_returned_item_images(
                lost_image_sources=lost_images_to_archive,
                found_image_sources=found_images_to_archive,
            )
            if not archive_result.get('success'):
                print(f"Archive warning: {archive_result}")
            
            # Create return record
            return_record = Returns(
                admin_id=admin_id,
                report_id=claim.report_id,
                student_name=claim.student_name,
                student_number=claim.student_number,
                contact_info=claim.contact_info,
                description=claim.description,
                status='returned',
                image=claim.image
            )
            db.session.add(return_record)
            return_announcement = {
                'report_id': claim.report_id,
                'item_name': report.item_name if report else 'N/A',
                'location': report.location if report else 'N/A',
                'returned_at': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
                'admin_id': admin_id,
            }
            
        elif action == 'reject':
            claim.status = 'rejected'
        else:
            return jsonify({"error": "Invalid action. Use 'approve' or 'reject'"}), 400
        
        db.session.commit()

        send_discord_notification(
            title='Claim Verification Update',
            description=f'A claim was {action}d during Verify Claims.',
            audience='admin',
            fields=[
                {'name': 'Claim ID', 'value': str(claim.claim_id), 'inline': True},
                {'name': 'Report ID', 'value': str(claim.report_id), 'inline': True},
                {'name': 'Admin ID', 'value': str(admin_id), 'inline': True},
                {'name': 'Result', 'value': claim.status, 'inline': True},
            ],
        )

        if return_announcement:
            send_discord_notification(
                title='FLIRT Return Update',
                description='An item has been successfully returned to its rightful owner.',
                audience='users',
                fields=[
                    {'name': 'Report ID', 'value': str(return_announcement['report_id']), 'inline': True},
                    {'name': 'Admin ID', 'value': str(return_announcement['admin_id']), 'inline': True},
                    {'name': 'Returned At', 'value': return_announcement['returned_at'], 'inline': True},
                    {'name': 'Item', 'value': return_announcement['item_name'] or 'N/A', 'inline': False},
                    {'name': 'Location', 'value': return_announcement['location'] or 'N/A', 'inline': False},
                ],
            )

        return jsonify({
            "message": f"Claim {action}d successfully",
            "claim": claim.to_json()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"ERROR: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@claim_bp.route('/claim/<int:claim_id>', methods=['GET'])
def get_claim(claim_id):
    """Get single claim by ID."""
    try:
        claim = PendingClaims.query.get(claim_id)
        if not claim:
            return jsonify({"error": "Claim not found"}), 404
        
        claim_data = claim.to_json()
        report = Reports.query.get(claim.report_id)
        if report:
            claim_data['report'] = report.to_json()

            found_item = FoundItems.query.filter_by(report_id=report.report_id).first()
            if found_item:
                claim_data['report']['finder'] = {
                    'name': found_item.finder_name,
                    'student_number': found_item.finder_student_number,
                    'contact_info': found_item.finder_contact_info,
                    'coordination_status': found_item.status,
                }
        
        return jsonify({"claim": claim_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500