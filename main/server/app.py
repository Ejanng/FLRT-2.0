from flask import Flask
from core.config import Config
from core.extensions import db, bcrypt, jwt, cors
from auth.routes import auth_bp
from reports.routes import report_bp
from claims.routes import claim_bp
from stats.routes import stats_bp  # New!
from models import *
from sift.routes import sift_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Enable CORS for all origins in development
    cors.init_app(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    with app.app_context():
        db.create_all()

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(report_bp, url_prefix='/reports')
    app.register_blueprint(claim_bp, url_prefix='/claims')
    app.register_blueprint(stats_bp, url_prefix='/stats')  # New!
    app.register_blueprint(sift_bp, url_prefix='/sift')

    print("✅ App initialized successfully")
    print(f"   Database: {Config.SQLALCHEMY_DATABASE_URI}")
    print(f"   Registered blueprints: auth, reports, claims, stats, sift")

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)