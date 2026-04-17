from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from shard_db import query_shard, query_all_shards, execute_shard, get_shard_for_member
from audit import log_action, get_current_username

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    updates = []
    args = []

    field_map = {
        'name': 'Name',
        'contact': 'ContactNumber',
        'address': 'Address',
        'showAddress': 'ShowAddress',
    }

    for key, col in field_map.items():
        if key in data:
            updates.append(f"{col} = %s")
            args.append(data[key])

    if not updates:
        return jsonify(error='No fields to update'), 400

    args.append(user_id)
    shard_id = get_shard_for_member(user_id)
    execute_shard(shard_id, f"UPDATE Member SET {', '.join(updates)} WHERE MemberID = %s", tuple(args))

    # Update subtype fields if provided
    member = query_shard(shard_id, "SELECT MemberType FROM Member WHERE MemberID = %s", (user_id,), one=True)
    if member:
        mt = member['MemberType']
        if mt == 'Student':
            sub_updates = []
            sub_args = []
            for field, key in [('Programme', 'programme'), ('Branch', 'branch'), ('CurrentYear', 'currentYear'), ('MessAssignment', 'messAssignment')]:
                if key in data:
                    sub_updates.append(f"{field} = %s")
                    sub_args.append(data[key])
            if sub_updates:
                sub_args.append(user_id)
                execute_shard(shard_id, f"UPDATE Student SET {', '.join(sub_updates)} WHERE MemberID = %s", tuple(sub_args))

    log_action('UPDATE_PROFILE', f"Updated profile settings: {', '.join(u.split(' =')[0] for u in updates)}", user=get_current_username())
    return jsonify(message='Profile updated')


@settings_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    current_pw = data.get('currentPassword', '')
    new_pw = data.get('newPassword', '')

    if not current_pw or not new_pw:
        return jsonify(error='Both current and new password required'), 400

    if len(new_pw) < 6:
        return jsonify(error='Password must be at least 6 characters'), 400

    shard_id = get_shard_for_member(user_id)
    member = query_shard(shard_id, "SELECT Password FROM Member WHERE MemberID = %s", (user_id,), one=True)
    if not member or not check_password_hash(member['Password'], current_pw):
        return jsonify(error='Current password is incorrect'), 401

    new_hash = generate_password_hash(new_pw)
    execute_shard(shard_id, "UPDATE Member SET Password = %s WHERE MemberID = %s", (new_hash, user_id))
    log_action('CHANGE_PASSWORD', "Password changed", user=get_current_username())
    return jsonify(message='Password changed successfully')


@settings_bp.route('/change-username', methods=['PUT'])
@jwt_required()
def change_username():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    new_username = data.get('username', '').strip()
    otp = data.get('otp', '').strip()
    email = data.get('email', '').strip().lower()

    if not new_username or not otp or not email:
        return jsonify(error='Username, email, and OTP are required'), 400

    if len(new_username) < 3:
        return jsonify(error='Username must be at least 3 characters'), 400

    # Verify OTP
    from email_service import verify_otp, clear_otp
    success, message = verify_otp(email, otp)
    if not success:
        return jsonify(error=message), 400

    # Check if username is taken (cross-shard query necessary as username is not shard key)
    existing_rows = query_all_shards(
        "SELECT MemberID FROM Member WHERE Username = %s AND MemberID != %s",
        (new_username, user_id),
    )
    existing = existing_rows[0] if existing_rows else None
    if existing:
        return jsonify(error='Username is already taken'), 409

    shard_id = get_shard_for_member(user_id)
    execute_shard(shard_id, "UPDATE Member SET Username = %s WHERE MemberID = %s", (new_username, user_id))
    clear_otp(email)
    log_action('CHANGE_USERNAME', f"Username changed to '{new_username}'", user=new_username)
    return jsonify(message='Username changed successfully', username=new_username)


@settings_bp.route('/privacy', methods=['GET'])
@jwt_required()
def get_privacy():
    user_id = int(get_jwt_identity())
    shard_id = get_shard_for_member(user_id)
    member = query_shard(shard_id, "SELECT ShowEmail, ShowContact, AllowQnA FROM Member WHERE MemberID = %s", (user_id,), one=True)
    if not member:
        return jsonify(error='User not found'), 404
    return jsonify(
        showEmail=bool(member['ShowEmail']),
        showContact=bool(member['ShowContact']),
        allowQnA=bool(member['AllowQnA']),
    )


@settings_bp.route('/privacy', methods=['PUT'])
@jwt_required()
def update_privacy():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    updates = []
    args = []
    field_map = {
        'showEmail': 'ShowEmail',
        'showContact': 'ShowContact',
        'allowQnA': 'AllowQnA',
    }
    for key, col in field_map.items():
        if key in data:
            updates.append(f"{col} = %s")
            args.append(bool(data[key]))

    if not updates:
        return jsonify(error='No fields to update'), 400

    args.append(user_id)
    shard_id = get_shard_for_member(user_id)
    execute_shard(shard_id, f"UPDATE Member SET {', '.join(updates)} WHERE MemberID = %s", tuple(args))
    log_action('UPDATE_PRIVACY', f"Updated privacy settings: {', '.join(u.split(' =')[0] for u in updates)}", user=get_current_username())
    return jsonify(message='Privacy settings updated')


@settings_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    shard_id = get_shard_for_member(user_id)
    log_action('DELETE_ACCOUNT', f"User deleted their own account (MemberID: {user_id})", user=get_current_username())
    execute_shard(shard_id, "DELETE FROM Member WHERE MemberID = %s", (user_id,))
    return jsonify(message='Account deleted')
