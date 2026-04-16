from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import query_db

members_bp = Blueprint('members', __name__)


@members_bp.route('/', methods=['GET'])
@jwt_required()
def get_members():
    search = request.args.get('search', '').strip()
    member_type = request.args.get('type', 'All')

    sql = "SELECT MemberID, Username, Name, Email, MemberType, ContactNumber, CreatedAt, AvatarColor FROM Member WHERE 1=1"
    args = []

    if search:
        sql += " AND (Name LIKE %s OR Username LIKE %s)"
        args.extend([f'%{search}%', f'%{search}%'])

    if member_type and member_type != 'All':
        sql += " AND MemberType = %s"
        args.append(member_type)

    sql += " ORDER BY Name"
    rows = query_db(sql, tuple(args))

    result = []
    for r in rows:
        result.append({
            'MemberID': r['MemberID'],
            'Username': r['Username'],
            'Name': r['Name'],
            'Email': r['Email'],
            'MemberType': r['MemberType'],
            'ContactNumber': r['ContactNumber'],
            'CreatedAt': str(r['CreatedAt']),
            'avatarColor': r['AvatarColor'],
        })
    return jsonify(result)
