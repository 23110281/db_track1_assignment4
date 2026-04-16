from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db
from audit import log_action, get_current_username

groups_bp = Blueprint('groups', __name__)


@groups_bp.route('/', methods=['GET'])
@jwt_required()
def get_groups():
    user_id = int(get_jwt_identity())
    search = request.args.get('search', '').strip()

    if search:
        rows = query_db("""
            SELECT g.*,
                   (SELECT COUNT(*) FROM GroupMembership WHERE GroupID = g.GroupID AND Status = 'approved') AS memberCount,
                   m.Name AS AdminName
            FROM CampusGroup g
            LEFT JOIN Member m ON g.AdminID = m.MemberID
            WHERE g.Name LIKE %s OR g.Description LIKE %s
            ORDER BY g.GroupID
        """, (f'%{search}%', f'%{search}%'))
    else:
        rows = query_db("""
            SELECT g.*,
                   (SELECT COUNT(*) FROM GroupMembership WHERE GroupID = g.GroupID AND Status = 'approved') AS memberCount,
                   m.Name AS AdminName
            FROM CampusGroup g
            LEFT JOIN Member m ON g.AdminID = m.MemberID
            ORDER BY g.GroupID
        """)

    # Get membership status for current user
    my_memberships = {}
    for r in query_db(
        "SELECT GroupID, Status FROM GroupMembership WHERE MemberID = %s", (user_id,)
    ):
        my_memberships[r['GroupID']] = r['Status']

    result = []
    for r in rows:
        membership_status = my_memberships.get(r['GroupID'])
        result.append({
            'GroupID': r['GroupID'],
            'Name': r['Name'],
            'Description': r['Description'],
            'AdminID': r['AdminID'],
            'AdminName': r['AdminName'],
            'memberCount': r['memberCount'],
            'IsRestricted': bool(r.get('IsRestricted', False)),
            'CreatedAt': str(r['CreatedAt']) if r.get('CreatedAt') else None,
            'isMember': membership_status == 'approved',
            'isPending': membership_status == 'pending',
        })
    return jsonify(result)


@groups_bp.route('/', methods=['POST'])
@jwt_required()
def create_group():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    is_restricted = bool(data.get('isRestricted', False))

    if not name:
        return jsonify(error='Group name is required'), 400

    group_id = execute_db(
        "INSERT INTO CampusGroup (Name, Description, AdminID, IsRestricted, CreatedAt) VALUES (%s,%s,%s,%s, CURDATE())",
        (name, description, user_id, is_restricted),
    )

    # Add creator as Admin member
    execute_db(
        "INSERT INTO GroupMembership (GroupID, MemberID, Role, Status, JoinedAt) VALUES (%s,%s,'Admin','approved', CURDATE())",
        (group_id, user_id),
    )

    log_action('CREATE_GROUP', f"Created group {group_id}: {name}", user=get_current_username())
    return jsonify(groupId=group_id), 201


@groups_bp.route('/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group(group_id):
    group = query_db("""
        SELECT g.*, m.Name AS AdminName
        FROM CampusGroup g
        LEFT JOIN Member m ON g.AdminID = m.MemberID
        WHERE g.GroupID = %s
    """, (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404

    members = query_db("""
        SELECT gm.Role, gm.JoinedAt, m.MemberID, m.Username, m.Name, m.MemberType, m.AvatarColor
        FROM GroupMembership gm
        JOIN Member m ON gm.MemberID = m.MemberID
        WHERE gm.GroupID = %s AND gm.Status = 'approved'
        ORDER BY FIELD(gm.Role, 'Admin', 'Moderator', 'Member'), gm.JoinedAt
    """, (group_id,))

    user_id = int(get_jwt_identity())
    my_membership = query_db(
        "SELECT Status FROM GroupMembership WHERE GroupID = %s AND MemberID = %s",
        (group_id, user_id), one=True,
    )

    # Count pending requests (for admin)
    pending_count = 0
    if group['AdminID'] == user_id:
        row = query_db(
            "SELECT COUNT(*) AS cnt FROM GroupMembership WHERE GroupID = %s AND Status = 'pending'",
            (group_id,), one=True,
        )
        pending_count = row['cnt'] if row else 0

    return jsonify({
        'GroupID': group['GroupID'],
        'Name': group['Name'],
        'Description': group['Description'],
        'AdminID': group['AdminID'],
        'AdminName': group['AdminName'],
        'IsRestricted': bool(group.get('IsRestricted', False)),
        'CreatedAt': str(group['CreatedAt']) if group.get('CreatedAt') else None,
        'isMember': my_membership['Status'] == 'approved' if my_membership else False,
        'isPending': my_membership['Status'] == 'pending' if my_membership else False,
        'pendingCount': pending_count,
        'members': [{
            'MemberID': m['MemberID'],
            'Username': m['Username'],
            'Name': m['Name'],
            'MemberType': m['MemberType'],
            'avatarColor': m['AvatarColor'],
            'Role': m['Role'],
            'JoinedAt': str(m['JoinedAt']),
        } for m in members],
    })


@groups_bp.route('/<int:group_id>/join', methods=['POST'])
@jwt_required()
def join_group(group_id):
    user_id = int(get_jwt_identity())
    existing = query_db(
        "SELECT * FROM GroupMembership WHERE GroupID = %s AND MemberID = %s",
        (group_id, user_id), one=True,
    )
    if existing:
        if existing['Status'] == 'approved':
            return jsonify(error='Already a member'), 409
        if existing['Status'] == 'pending':
            return jsonify(error='Request already pending'), 409
        # If rejected, allow re-request
        execute_db(
            "UPDATE GroupMembership SET Status = 'pending', JoinedAt = CURDATE() WHERE GroupID = %s AND MemberID = %s",
            (group_id, user_id),
        )
        log_action('REJOIN_REQUEST', f"Re-requested to join group {group_id}", user=get_current_username())
        return jsonify(message='Join request sent', pending=True)

    # Check if group is restricted
    group = query_db("SELECT IsRestricted FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404

    if group['IsRestricted']:
        execute_db(
            "INSERT INTO GroupMembership (GroupID, MemberID, Role, Status, JoinedAt) VALUES (%s,%s,'Member','pending', CURDATE())",
            (group_id, user_id),
        )
        log_action('JOIN_REQUEST', f"Requested to join restricted group {group_id}", user=get_current_username())
        return jsonify(message='Join request sent', pending=True)
    else:
        execute_db(
            "INSERT INTO GroupMembership (GroupID, MemberID, Role, Status, JoinedAt) VALUES (%s,%s,'Member','approved', CURDATE())",
            (group_id, user_id),
        )
        log_action('JOIN_GROUP', f"Joined group {group_id}", user=get_current_username())
        return jsonify(message='Joined group', pending=False)


@groups_bp.route('/<int:group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    user_id = int(get_jwt_identity())
    execute_db(
        "DELETE FROM GroupMembership WHERE GroupID = %s AND MemberID = %s",
        (group_id, user_id),
    )
    log_action('LEAVE_GROUP', f"Left group {group_id}", user=get_current_username())
    return jsonify(message='Left group')


@groups_bp.route('/<int:group_id>/pending', methods=['GET'])
@jwt_required()
def get_pending_requests(group_id):
    user_id = int(get_jwt_identity())
    group = query_db("SELECT AdminID FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404
    if group['AdminID'] != user_id:
        return jsonify(error='Only admin can view pending requests'), 403

    rows = query_db("""
        SELECT gm.JoinedAt, m.MemberID, m.Username, m.Name, m.MemberType, m.AvatarColor
        FROM GroupMembership gm
        JOIN Member m ON gm.MemberID = m.MemberID
        WHERE gm.GroupID = %s AND gm.Status = 'pending'
        ORDER BY gm.JoinedAt ASC
    """, (group_id,))

    return jsonify([{
        'MemberID': r['MemberID'],
        'Username': r['Username'],
        'Name': r['Name'],
        'MemberType': r['MemberType'],
        'avatarColor': r['AvatarColor'],
        'RequestedAt': str(r['JoinedAt']),
    } for r in rows])


@groups_bp.route('/<int:group_id>/approve/<int:member_id>', methods=['POST'])
@jwt_required()
def approve_request(group_id, member_id):
    user_id = int(get_jwt_identity())
    group = query_db("SELECT AdminID FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404
    if group['AdminID'] != user_id:
        return jsonify(error='Only admin can approve requests'), 403

    execute_db(
        "UPDATE GroupMembership SET Status = 'approved', JoinedAt = CURDATE() WHERE GroupID = %s AND MemberID = %s AND Status = 'pending'",
        (group_id, member_id),
    )
    log_action('APPROVE_JOIN', f"Approved member {member_id} for group {group_id}", user=get_current_username())
    return jsonify(message='Request approved')


@groups_bp.route('/<int:group_id>/reject/<int:member_id>', methods=['POST'])
@jwt_required()
def reject_request(group_id, member_id):
    user_id = int(get_jwt_identity())
    group = query_db("SELECT AdminID FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404
    if group['AdminID'] != user_id:
        return jsonify(error='Only admin can reject requests'), 403

    execute_db(
        "DELETE FROM GroupMembership WHERE GroupID = %s AND MemberID = %s AND Status = 'pending'",
        (group_id, member_id),
    )
    log_action('REJECT_JOIN', f"Rejected member {member_id} for group {group_id}", user=get_current_username())
    return jsonify(message='Request rejected')


@groups_bp.route('/<int:group_id>', methods=['PUT'])
@jwt_required()
def update_group(group_id):
    user_id = int(get_jwt_identity())
    group = query_db("SELECT AdminID FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404
    if group['AdminID'] != user_id:
        return jsonify(error='Only admin can edit group'), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    is_restricted = bool(data.get('isRestricted', False))

    if not name:
        return jsonify(error='Group name is required'), 400

    execute_db(
        "UPDATE CampusGroup SET Name = %s, Description = %s, IsRestricted = %s WHERE GroupID = %s",
        (name, description, is_restricted, group_id),
    )
    log_action('UPDATE_GROUP', f"Updated group {group_id}", user=get_current_username())
    return jsonify(message='Group updated')


@groups_bp.route('/<int:group_id>', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    user_id = int(get_jwt_identity())
    group = query_db("SELECT AdminID FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404
    if group['AdminID'] != user_id:
        return jsonify(error='Only admin can delete group'), 403

    execute_db("DELETE FROM CampusGroup WHERE GroupID = %s", (group_id,))
    log_action('DELETE_GROUP', f"Deleted group {group_id}", user=get_current_username())
    return jsonify(message='Group deleted')


@groups_bp.route('/<int:group_id>/kick/<int:member_id>', methods=['POST'])
@jwt_required()
def kick_member(group_id, member_id):
    user_id = int(get_jwt_identity())
    group = query_db("SELECT AdminID FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404
    if group['AdminID'] != user_id:
        return jsonify(error='Only admin can kick members'), 403
    if member_id == user_id:
        return jsonify(error='Cannot kick yourself'), 400

    execute_db(
        "DELETE FROM GroupMembership WHERE GroupID = %s AND MemberID = %s",
        (group_id, member_id),
    )
    log_action('KICK_MEMBER', f"Kicked member {member_id} from group {group_id}", user=get_current_username())
    return jsonify(message='Member removed')


@groups_bp.route('/<int:group_id>/make-admin/<int:member_id>', methods=['POST'])
@jwt_required()
def make_admin(group_id, member_id):
    user_id = int(get_jwt_identity())
    group = query_db("SELECT AdminID FROM CampusGroup WHERE GroupID = %s", (group_id,), one=True)
    if not group:
        return jsonify(error='Group not found'), 404
    if group['AdminID'] != user_id:
        return jsonify(error='Only admin can transfer admin role'), 403

    # Update the group admin
    execute_db("UPDATE CampusGroup SET AdminID = %s WHERE GroupID = %s", (member_id, group_id))
    # Update roles
    execute_db(
        "UPDATE GroupMembership SET Role = 'Admin' WHERE GroupID = %s AND MemberID = %s",
        (group_id, member_id),
    )
    execute_db(
        "UPDATE GroupMembership SET Role = 'Member' WHERE GroupID = %s AND MemberID = %s",
        (group_id, user_id),
    )
    log_action('TRANSFER_ADMIN', f"Transferred admin of group {group_id} to member {member_id}", user=get_current_username())
    return jsonify(message='Admin role transferred')


@groups_bp.route('/<int:group_id>/posts', methods=['GET'])
@jwt_required()
def get_group_posts(group_id):
    user_id = int(get_jwt_identity())
    rows = query_db("""
        SELECT p.*, m.Username, m.Name, m.MemberType, m.AvatarColor,
               (SELECT COUNT(*) FROM PostLike WHERE PostID = p.PostID) AS likes,
               (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID) AS commentCount
        FROM Post p
        JOIN Member m ON p.AuthorID = m.MemberID
        WHERE p.GroupID = %s
        ORDER BY p.CreatedAt DESC
    """, (group_id,))

    liked_posts = {r['PostID'] for r in query_db(
        "SELECT PostID FROM PostLike WHERE MemberID = %s", (user_id,)
    )}

    result = []
    for r in rows:
        result.append({
            'PostID': r['PostID'],
            'AuthorID': r['AuthorID'],
            'GroupID': r['GroupID'],
            'Content': r['Content'],
            'ImageURL': r['ImageURL'],
            'CreatedAt': str(r['CreatedAt']),
            'likes': r['likes'],
            'commentCount': r['commentCount'],
            'liked': r['PostID'] in liked_posts,
            'author': {
                'MemberID': r['AuthorID'],
                'Username': r['Username'],
                'Name': r['Name'],
                'MemberType': r['MemberType'],
                'avatarColor': r['AvatarColor'],
            },
        })
    return jsonify(result)
