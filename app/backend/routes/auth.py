from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from db import query_db, execute_db
from shard_db import query_all_shards, execute_shard, get_shard_for_member
from audit import log_action
import random

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify(error='Username and password required'), 400

    # Allow login with username or email
    if '@' in username:
        member = query_all_shards("SELECT * FROM Member WHERE Email = %s", (username,))
    else:
        member = query_all_shards("SELECT * FROM Member WHERE Username = %s", (username,))
        
    member = member[0] if member else None
    
    if not member or not check_password_hash(member['Password'], password):
        return jsonify(error='Invalid credentials'), 401

    # Get subtype details from specific shard
    shard_id = get_shard_for_member(member['MemberID'])
    subtype = {}
    
    def get_subtype(table):
        res = query_all_shards(f"SELECT * FROM {table} WHERE MemberID = %s", (member['MemberID'],))
        return res[0] if res else {}

    if member['MemberType'] == 'Student':
        subtype = get_subtype("Student")
    elif member['MemberType'] == 'Professor':
        subtype = get_subtype("Professor")
    elif member['MemberType'] == 'Alumni':
        subtype = get_subtype("Alumni")
    elif member['MemberType'] == 'Organization':
        subtype = get_subtype("Organization")

    token = create_access_token(identity=str(member['MemberID']))

    user = {
        'MemberID': member['MemberID'],
        'Username': member['Username'],
        'Name': member['Name'],
        'Email': member['Email'],
        'MemberType': member['MemberType'],
        'ContactNumber': member['ContactNumber'],
        'CreatedAt': str(member['CreatedAt']),
        'avatarColor': member['AvatarColor'],
        'isAdmin': bool(member['IsAdmin']),
        'role': 'Admin' if member['IsAdmin'] else 'Regular',
    }

    # Merge subtype fields
    for k, v in subtype.items():
        if k != 'MemberID':
            user[k] = str(v) if hasattr(v, 'isoformat') else v

    log_action('LOGIN', f"User '{username}' logged in successfully", user=username)
    return jsonify(message="Login successful", token=token, session_token=token, user=user)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    member_type = data.get('memberType', '')
    contact = data.get('contactNumber', '')

    if not all([username, name, email, password, member_type]):
        return jsonify(error='All fields are required'), 400

    if not email.endswith('@iitgn.ac.in'):
        return jsonify(error='Only @iitgn.ac.in email addresses are allowed'), 400

    # Check OTP verification (in-memory)
    from email_service import is_email_verified
    if not is_email_verified(email):
        return jsonify(error='Email not verified. Please verify your email first.'), 400

    existing = query_all_shards("SELECT MemberID FROM Member WHERE Username = %s OR Email = %s", (username, email))
    if existing:
        return jsonify(error='Username or email already exists'), 409

    pw_hash = generate_password_hash(password)
    member_id = random.randint(100000, 9999999) # Generate unique shard key
    shard_id = get_shard_for_member(member_id)

    execute_shard(shard_id,
        "INSERT INTO Member (MemberID, Username, Name, Email, Password, MemberType, ContactNumber, CreatedAt, AvatarColor) VALUES (%s,%s,%s,%s,%s,%s,%s, CURDATE(), '#4F46E5')",
        (member_id, username, name, email, pw_hash, member_type, contact),
    )

    # Insert subtype row on the SAME shard
    if member_type == 'Student':
        execute_shard(shard_id,
            "INSERT INTO Student (MemberID, Programme, Branch, CurrentYear, MessAssignment) VALUES (%s,%s,%s,%s,%s)",
            (member_id, data.get('programme', ''), data.get('branch', ''), data.get('currentYear', 1), data.get('messAssignment', '')),
        )
    elif member_type == 'Professor':
        execute_shard(shard_id,
            "INSERT INTO Professor (MemberID, Designation, Department, JoiningDate) VALUES (%s,%s,%s, CURDATE())",
            (member_id, data.get('designation', ''), data.get('department', '')),
        )
    elif member_type == 'Alumni':
        execute_shard(shard_id,
            "INSERT INTO Alumni (MemberID, CurrentOrganization, GraduationYear, Verified) VALUES (%s,%s,%s, FALSE)",
            (member_id, data.get('currentOrganization', ''), data.get('graduationYear', 2024)),
        )
    elif member_type == 'Organization':
        execute_shard(shard_id,
            "INSERT INTO Organization (MemberID, OrgType, FoundationDate, ContactEmail) VALUES (%s,%s, CURDATE(),%s)",
            (member_id, data.get('orgType', ''), email),
        )

    # Clean up OTP record from memory after successful registration
    from email_service import clear_otp
    clear_otp(email)

    log_action('REGISTER', f"New {member_type} registered: '{username}' (ID: {member_id})", user=username)
    return jsonify(message='Registration successful', memberId=member_id), 201


@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify(error='Email is required'), 400

    if not email.endswith('@iitgn.ac.in'):
        return jsonify(error='Only @iitgn.ac.in email addresses are allowed'), 400

    # Check if email already registered
    existing = query_all_shards("SELECT MemberID FROM Member WHERE Email = %s", (email,))
    if existing:
        return jsonify(error='This email is already registered'), 409

    from email_service import create_otp
    success, message = create_otp(email)

    if success:
        log_action('SEND_OTP', f"OTP sent to {email}", user='anonymous')
        return jsonify(message=message), 200
    else:
        return jsonify(error=message), 400


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp_endpoint():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()

    if not email or not otp:
        return jsonify(error='Email and OTP are required'), 400

    from email_service import verify_otp
    success, message = verify_otp(email, otp)

    if success:
        log_action('VERIFY_OTP', f"Email {email} verified successfully", user='anonymous')
        return jsonify(message=message, verified=True), 200
    else:
        return jsonify(error=message, verified=False), 400


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify(error='Email is required'), 400

    if not email.endswith('@iitgn.ac.in'):
        return jsonify(error='Only @iitgn.ac.in email addresses are allowed'), 400

    member = query_all_shards("SELECT MemberID, Username FROM Member WHERE Email = %s", (email,))
    member = member[0] if member else None
    
    if not member:
        return jsonify(error='No account found with this email'), 404

    from email_service import create_otp
    success, message = create_otp(email)

    if success:
        log_action('FORGOT_PASSWORD', f"Password reset OTP sent to {email}", user=member['Username'])
        return jsonify(message='OTP sent to your email'), 200
    else:
        return jsonify(error=message), 400


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()
    new_password = data.get('newPassword', '')

    if not all([email, otp, new_password]):
        return jsonify(error='Email, OTP, and new password are required'), 400

    if len(new_password) < 6:
        return jsonify(error='Password must be at least 6 characters'), 400

    from email_service import verify_otp
    success, message = verify_otp(email, otp)
    if not success:
        return jsonify(error=message), 400

    pw_hash = generate_password_hash(new_password)
    member = query_all_shards("SELECT MemberID, Username FROM Member WHERE Email = %s", (email,))
    if member:
        m = member[0]
        shard_id = get_shard_for_member(m['MemberID'])
        execute_shard(shard_id, "UPDATE Member SET Password = %s WHERE MemberID = %s", (pw_hash, m['MemberID']))

    from email_service import clear_otp
    clear_otp(email)

    log_action('RESET_PASSWORD', f"Password reset for {email}", user=member[0]['Username'] if member else 'unknown')
    return jsonify(message='Password reset successfully'), 200


@auth_bp.route('/isAuth', methods=['GET'])
@jwt_required()
def is_authenticated():
    try:
        member_id = get_jwt_identity()
        jwt_data = get_jwt()

        member = query_all_shards("SELECT Username, IsAdmin FROM Member WHERE MemberID = %s", (member_id,))
        member = member[0] if member else None
        
        if not member:
            return jsonify(error="No session found"), 401

        role = "Admin" if member['IsAdmin'] else "Regular"
        expiry = datetime.fromtimestamp(jwt_data['exp']).isoformat()

        return jsonify(
            message="User is authenticated",
            username=member['Username'],
            role=role,
            expiry=expiry
        ), 200
    except Exception as e:
        return jsonify(error="Invalid token", details=str(e)), 401
