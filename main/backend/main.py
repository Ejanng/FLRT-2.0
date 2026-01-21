from flask import request, jsonify
from config import app, db
from models import Reports

@app.route('/reports', methods=['POST'])
def create_report():
    data = request.get_json()
    new_report = Reports(
        object_name=data['object_name'],
        category=data['category'],
        description=data['description'],
        date_reported=data['date_reported'],
        last_location=data['last_location'],
        status=data['status'],
        reporter_contact=data.get('reporter_contact'),
        image_url=data.get('image_url')
    )
    db.session.add(new_report)
    db.session.commit()
    return jsonify(new_report.to_json()), 201

@app.route('/get-reports', methods=['GET'])
def get_reports():
    reports = Reports.query.all()
    return jsonify([report.to_json() for report in reports]), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)