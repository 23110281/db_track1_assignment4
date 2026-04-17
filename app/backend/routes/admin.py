from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import traceback
from db import get_db
from shard_db import query_shard, query_all_shards, execute_shard, execute_all_shards, get_shard_for_member
from audit import log_action, log_to_db, get_current_username

admin_bp = Blueprint('admin', __name__)


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user_shard = get_shard_for_member(user_id)
        member = query_shard(user_shard, "SELECT IsAdmin, Username FROM Member WHERE MemberID = %s", (user_id,), one=True)
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
    members_count = sum(r['c'] for r in query_all_shards("SELECT COUNT(*) AS c FROM Member"))
    posts_count = sum(r['c'] for r in query_all_shards("SELECT COUNT(*) AS c FROM Post"))
    comments_count = sum(r['c'] for r in query_all_shards("SELECT COUNT(*) AS c FROM Comment"))

    # Replicated tables are counted from one canonical shard to avoid 3x overcount.
    groups_row = query_shard(0, "SELECT COUNT(*) AS c FROM CampusGroup", one=True)
    polls_row = query_shard(0, "SELECT COUNT(*) AS c FROM Poll", one=True)
    jobs_row = query_shard(0, "SELECT COUNT(*) AS c FROM JobPost", one=True)
    groups_count = groups_row['c'] if groups_row else 0
    polls_count = polls_row['c'] if polls_row else 0
    jobs_count = jobs_row['c'] if jobs_row else 0

    type_breakdown_rows = query_all_shards("SELECT MemberType, COUNT(*) AS c FROM Member GROUP BY MemberType")
    type_breakdown = {}
    for row in type_breakdown_rows:
        type_breakdown[row['MemberType']] = type_breakdown.get(row['MemberType'], 0) + row['c']

    return jsonify({
        'totalMembers': members_count,
        'totalPosts': posts_count,
        'totalGroups': groups_count,
        'totalPolls': polls_count,
        'totalComments': comments_count,
        'totalJobs': jobs_count,
        'memberTypeBreakdown': type_breakdown,
    })


@admin_bp.route('/members', methods=['GET'])
@admin_required
def get_members():
    rows = query_all_shards("""
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
    member_shard = get_shard_for_member(member_id)
    execute_shard(member_shard, f"UPDATE Member SET {', '.join(updates)} WHERE MemberID = %s", tuple(args))
    log_action('ADMIN_UPDATE_MEMBER', f"Admin updated member {member_id}: {', '.join(updates)}", user=get_current_username())
    return jsonify(message='Member updated')


@admin_bp.route('/members/<int:member_id>', methods=['DELETE'])
@admin_required
def delete_member(member_id):
    user_id = int(get_jwt_identity())
    if member_id == user_id:
        return jsonify(error='Cannot delete yourself'), 400

    member_shard = get_shard_for_member(member_id)
    execute_shard(member_shard, "DELETE FROM Member WHERE MemberID = %s", (member_id,))
    log_action('ADMIN_DELETE_MEMBER', f"Admin deleted member {member_id}", user=get_current_username())
    return jsonify(message='Member deleted')


@admin_bp.route('/groups', methods=['GET'])
@admin_required
def get_groups():
    rows = query_all_shards("""
        SELECT g.*,
               (SELECT COUNT(*) FROM GroupMembership WHERE GroupID = g.GroupID) AS memberCount,
               m.Name AS AdminName
        FROM CampusGroup g
        LEFT JOIN Member m ON g.AdminID = m.MemberID
        ORDER BY g.GroupID
    """)
    unique_groups = {}
    for row in rows:
        gid = row['GroupID']
        if gid not in unique_groups:
            unique_groups[gid] = dict(row)
            unique_groups[gid]['memberCount'] = row.get('memberCount', 0)
        else:
            unique_groups[gid]['memberCount'] += row.get('memberCount', 0)
            if not unique_groups[gid].get('AdminName') and row.get('AdminName'):
                unique_groups[gid]['AdminName'] = row.get('AdminName')
    result = []
    for r in sorted(unique_groups.values(), key=lambda x: x['GroupID']):
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
    execute_all_shards("DELETE FROM CampusGroup WHERE GroupID = %s", (group_id,))
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
