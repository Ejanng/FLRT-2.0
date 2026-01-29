from flask import Flask
from core.config import Config
from core.extensions import db, bcrypt, jwt, cors
from auth.routes import  auth_bp
from admin.routes import admin_bp
from models import *
# from routes.claims_route import claims_bp
# from routes.reports_route import users_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)

    with app.app_context():
        db.create_all()

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    # app.register_blueprint(claims_bp, url_prefix='/claims')
    # app.register_blueprint(users_bp, url_prefix='/users')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)