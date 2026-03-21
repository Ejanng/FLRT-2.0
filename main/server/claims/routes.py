from flask import Blueprint, request, jsonify
from models.pending_claims_model import PendingClaims
from models.reports_model import Reports
from models.returns_model import Returns
from core.extensions import db
from datetime import datetime, timezone

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
                    'image': report.image
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
        
        claim = PendingClaims.query.get(claim_id)
        if not claim:
            return jsonify({"error": "Claim not found"}), 404
        
        if claim.status != 'pending':
            return jsonify({"error": f"Claim is already {claim.status}"}), 400
        
        if action == 'approve':
            claim.status = 'accepted'
            
            # Update report status to returned
            report = Reports.query.get(claim.report_id)
            if report:
                report.status = 'returned'
            
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
            
        elif action == 'reject':
            claim.status = 'rejected'
        else:
            return jsonify({"error": "Invalid action. Use 'approve' or 'reject'"}), 400
        
        db.session.commit()
        
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
        
        return jsonify({"claim": claim_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500