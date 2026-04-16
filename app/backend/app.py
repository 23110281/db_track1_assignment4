from datetime import timedelta
from flask import Flask, request as flask_request
from flask_cors import CORS
from flask_jwt_extended import JWTManager

import config
from audit import log_action, log_to_db, get_current_username
from routes.auth import auth_bp
from routes.posts import posts_bp
from routes.groups import groups_bp
from routes.jobs import jobs_bp
from routes.polls import polls_bp
from routes.attendance import attendance_bp
from routes.profile import profile_bp
from routes.members import members_bp
from routes.admin import admin_bp
from routes.settings import settings_bp

import os

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = config.JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(seconds=config.JWT_ACCESS_TOKEN_EXPIRES)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB max

CORS(app, origins=['http://localhost:5173', 'http://127.0.0.1:5173'])
jwt = JWTManager(app)


# --- JWT error handlers: log unauthorized API access to audit.log ---
@jwt.unauthorized_loader
def handle_missing_token(reason):
    log_action('UNAUTHORIZED_ACCESS', f"Missing/invalid JWT on {flask_request.method} {flask_request.path} — {reason}", user='UNAUTHORIZED')
    log_to_db(
        username='UNAUTHORIZED',
        action='MISSING_TOKEN',
        endpoint=flask_request.path,
        ip=flask_request.remote_addr or '127.0.0.1',
        details=f"No valid JWT provided: {reason}",
        is_authorized=False,
    )
    return {'error': 'Authorization token is missing or invalid'}, 401


@jwt.expired_token_loader
def handle_expired_token(jwt_header, jwt_payload):
    user = jwt_payload.get('sub', 'unknown')
    log_action('UNAUTHORIZED_ACCESS', f"Expired JWT (user_id={user}) on {flask_request.method} {flask_request.path}", user='EXPIRED_TOKEN')
    log_to_db(
        username=f'uid:{user}',
        action='EXPIRED_TOKEN',
        endpoint=flask_request.path,
        ip=flask_request.remote_addr or '127.0.0.1',
        details=f"Expired JWT token for user_id={user}",
        is_authorized=False,
    )
    return {'error': 'Token has expired, please login again'}, 401


@jwt.invalid_token_loader
def handle_invalid_token(reason):
    log_action('UNAUTHORIZED_ACCESS', f"Invalid/tampered JWT on {flask_request.method} {flask_request.path} — {reason}", user='INVALID_TOKEN')
    log_to_db(
        username='INVALID_TOKEN',
        action='INVALID_TOKEN',
        endpoint=flask_request.path,
        ip=flask_request.remote_addr or '127.0.0.1',
        details=f"Invalid/tampered JWT: {reason}",
        is_authorized=False,
    )
    return {'error': 'Token is invalid'}, 401

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(posts_bp, url_prefix='/api')
app.register_blueprint(groups_bp, url_prefix='/api/groups')
app.register_blueprint(jobs_bp, url_prefix='/api')
app.register_blueprint(polls_bp, url_prefix='/api/polls')
app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
app.register_blueprint(profile_bp, url_prefix='/api')
app.register_blueprint(members_bp, url_prefix='/api/members')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(settings_bp, url_prefix='/api/settings')


# --- Audit logging: log all data-modifying requests ---
# These auth endpoints already log with the actual username inside their route handlers,
# so we skip them here to avoid duplicate "anonymous" log entries.
SELF_LOGGED_ENDPOINTS = {
    '/api/auth/login', '/api/auth/register', '/api/auth/send-otp',
    '/api/auth/verify-otp', '/api/auth/forgot-password', '/api/auth/reset-password',
}

@app.after_request
def audit_log_request(response):
    if flask_request.method in ('POST', 'PUT', 'DELETE'):
        # Skip endpoints that already handle their own audit logging
        if flask_request.path in SELF_LOGGED_ENDPOINTS:
            return response
        username = 'anonymous'
        try:
            username = get_current_username()
        except Exception:
            pass
        status = response.status_code
        details = f"{flask_request.method} {flask_request.path} -> {status}"
        log_action(flask_request.method, details, user=username)
        log_to_db(
            username=username,
            action=flask_request.method,
            endpoint=flask_request.path,
            ip=flask_request.remote_addr or '127.0.0.1',
            details=details,
            is_authorized=True,
        )
    return response


from flask import send_from_directory
from flask_jwt_extended import jwt_required as _jr, get_jwt_identity
import uuid

@app.route('/api/upload', methods=['POST'])
@_jr()
def upload_file():
    if 'file' not in flask_request.files:
        return {'error': 'No file provided'}, 400
    f = flask_request.files['file']
    if not f.filename:
        return {'error': 'No file selected'}, 400
    allowed = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
    if ext not in allowed:
        return {'error': f'File type .{ext} not allowed'}, 400
    filename = f"{uuid.uuid4().hex}.{ext}"
    f.save(os.path.join(UPLOAD_FOLDER, filename))
    url = f"http://localhost:5001/uploads/{filename}"
    return {'url': url}, 201

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/')
def welcome():
    return {'message': 'Welcome to test APIs'}


@app.route('/api/health')
def health():
    return {'status': 'ok'}


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5001)
