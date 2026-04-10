from flask import Flask
import os
from core.config import Config
from core.extensions import db, bcrypt, jwt, cors
from auth.routes import auth_bp
from reports.routes import report_bp
from claims.routes import claim_bp
from stats.routes import stats_bp  # New!
from found_items.routes import found_items_bp  # New!
from models import *
from sift.routes import sift_bp
from core.notifications import is_valid_discord_webhook_url

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
    app.register_blueprint(found_items_bp, url_prefix='/found-items')  # New!
    app.register_blueprint(sift_bp, url_prefix='/sift')

    print("✅ App initialized successfully")
    print(f"   Database: {Config.SQLALCHEMY_DATABASE_URI}")
    print(f"   Registered blueprints: auth, reports, claims, stats, found-items, sift")
    if Config.DISCORD_ADMIN_WEBHOOK_URL:
        admin_status = 'valid' if is_valid_discord_webhook_url(Config.DISCORD_ADMIN_WEBHOOK_URL) else 'invalid'
        print(f"   Discord admin webhook: configured ({admin_status})")
    else:
        print("   Discord admin webhook: not configured")

    if Config.DISCORD_USER_WEBHOOK_URL:
        user_status = 'valid' if is_valid_discord_webhook_url(Config.DISCORD_USER_WEBHOOK_URL) else 'invalid'
        print(f"   Discord user webhook: configured ({user_status})")
    else:
        print("   Discord user webhook: not configured")

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    debug_mode = os.getenv('FLASK_DEBUG', '0').strip().lower() in ('1', 'true', 'yes', 'on')
    app.run(
        debug=debug_mode,
        use_reloader=debug_mode,
        host='0.0.0.0',
        port=port,
    )