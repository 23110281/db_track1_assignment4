from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import traceback
from db import query_db, execute_db, get_db
from audit import log_action, log_to_db, get_current_username

admin_bp = Blueprint('admin', __name__)


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        member = query_db("SELECT IsAdmin, Username FROM Member WHERE MemberID = %s", (user_id,), one=True)
        if not member or not member['IsAdmin']:
            username = member['Username'] if member else f'uid:{user_id}'
            log_action('FORBIDDEN_ACCESS', f"Non-admin user '{username}' attempted {request.method} {request.path}", user=username)
            log_to_db(
                username=username,
                action='FORBIDDEN_ACCESS',
                endpoint=request.path,
                ip=request.remote_addr or '127.0.0.1',
                details=f"Non-admin user '{username}' tried to access admin endpoint {request.path}",
                is_authorized=False,
            )
            return jsonify(error='Admin access required'), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    members_count = query_db("SELECT COUNT(*) AS c FROM Member", one=True)['c']
    posts_count = query_db("SELECT COUNT(*) AS c FROM Post", one=True)['c']
    groups_count = query_db("SELECT COUNT(*) AS c FROM CampusGroup", one=True)['c']
    polls_count = query_db("SELECT COUNT(*) AS c FROM Poll", one=True)['c']
    comments_count = query_db("SELECT COUNT(*) AS c FROM Comment", one=True)['c']
    jobs_count = query_db("SELECT COUNT(*) AS c FROM JobPost", one=True)['c']

    type_breakdown = query_db("SELECT MemberType, COUNT(*) AS c FROM Member GROUP BY MemberType")

    return jsonify({
        'totalMembers': members_count,
        'totalPosts': posts_count,
        'totalGroups': groups_count,
        'totalPolls': polls_count,
        'totalComments': comments_count,
        'totalJobs': jobs_count,
        'memberTypeBreakdown': {r['MemberType']: r['c'] for r in type_breakdown},
    })


@admin_bp.route('/members', methods=['GET'])
@admin_required
def get_members():
    rows = query_db("""
        SELECT MemberID, Username, Name, Email, MemberType, ContactNumber, CreatedAt, AvatarColor, IsAdmin
        FROM Member ORDER BY MemberID
    """)
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
            'isAdmin': bool(r['IsAdmin']),
        })
    return jsonify(result)


@admin_bp.route('/members/<int:member_id>', methods=['PUT'])
@admin_required
def update_member(member_id):
    data = request.get_json()
    member_type = data.get('memberType')
    name = data.get('name')
    email = data.get('email')

    updates = []
    args = []
    if member_type:
        updates.append("MemberType = %s")
        args.append(member_type)
    if name:
        updates.append("Name = %s")
        args.append(name)
    if email:
        updates.append("Email = %s")
        args.append(email)

    if not updates:
        return jsonify(error='No fields to update'), 400

    args.append(member_id)
    execute_db(f"UPDATE Member SET {', '.join(updates)} WHERE MemberID = %s", tuple(args))
    log_action('ADMIN_UPDATE_MEMBER', f"Admin updated member {member_id}: {', '.join(updates)}", user=get_current_username())
    return jsonify(message='Member updated')


@admin_bp.route('/members/<int:member_id>', methods=['DELETE'])
@admin_required
def delete_member(member_id):
    user_id = int(get_jwt_identity())
    if member_id == user_id:
        return jsonify(error='Cannot delete yourself'), 400

    execute_db("DELETE FROM Member WHERE MemberID = %s", (member_id,))
    log_action('ADMIN_DELETE_MEMBER', f"Admin deleted member {member_id}", user=get_current_username())
    return jsonify(message='Member deleted')


@admin_bp.route('/groups', methods=['GET'])
@admin_required
def get_groups():
    rows = query_db("""
        SELECT g.*,
               (SELECT COUNT(*) FROM GroupMembership WHERE GroupID = g.GroupID) AS memberCount,
               m.Name AS AdminName
        FROM CampusGroup g
        LEFT JOIN Member m ON g.AdminID = m.MemberID
        ORDER BY g.GroupID
    """)
    result = []
    for r in rows:
        result.append({
            'GroupID': r['GroupID'],
            'Name': r['Name'],
            'Description': r['Description'],
            'AdminID': r['AdminID'],
            'AdminName': r['AdminName'],
            'memberCount': r['memberCount'],
        })
    return jsonify(result)


@admin_bp.route('/groups/<int:group_id>', methods=['DELETE'])
@admin_required
def delete_group(group_id):
    execute_db("DELETE FROM CampusGroup WHERE GroupID = %s", (group_id,))
    log_action('ADMIN_DELETE_GROUP', f"Admin deleted group {group_id}", user=get_current_username())
    return jsonify(message='Group deleted')


@admin_bp.route('/query', methods=['POST'])
@admin_required
def run_query():
    data = request.get_json()
    sql = (data.get('query') or '').strip()
    if not sql:
        return jsonify(error='Query is required'), 400

    username = get_current_username()
    log_action('ADMIN_SQL_QUERY', f"Admin executed SQL: {sql[:500]}", user=username)

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql)

        # Determine if this is a SELECT-type query
        if cursor.description:
            rows = cursor.fetchall()
            # Convert non-serializable types to strings
            for row in rows:
                for key, val in row.items():
                    if not isinstance(val, (str, int, float, bool, type(None))):
                        row[key] = str(val)
            cursor.close()
            conn.close()
            return jsonify(type='select', rows=rows, rowCount=len(rows))
        else:
            affected = cursor.rowcount
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify(type='modify', affectedRows=affected)
    except Exception as e:
        return jsonify(error=str(e)), 400
