from flask import Flask
from config import Config
from extensions import db, bcrypt, jwt, cors, redis_client
from routes import *
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
    # redis_client.init_app(app)

    with app.app_context():
        db.create_all()

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(list_users_bp, url_prefix='/users')
    # app.register_blueprint(claims_bp, url_prefix='/claims')
    # app.register_blueprint(users_bp, url_prefix='/users')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)