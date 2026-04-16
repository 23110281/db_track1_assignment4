from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db
from audit import log_action, get_current_username

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('/profile/<int:member_id>', methods=['GET'])
@jwt_required()
def get_profile(member_id):
    viewer_id = int(get_jwt_identity())
    member = query_db("SELECT * FROM Member WHERE MemberID = %s", (member_id,), one=True)
    if not member:
        return jsonify(error='Member not found'), 404

    show_email = bool(member.get('ShowEmail', True))
    show_contact = bool(member.get('ShowContact', True))
    allow_qna = bool(member.get('AllowQnA', True))

    user = {
        'MemberID': member['MemberID'],
        'Username': member['Username'],
        'Name': member['Name'],
        'Email': member['Email'] if show_email else None,
        'MemberType': member['MemberType'],
        'ContactNumber': member['ContactNumber'] if show_contact else None,
        'CreatedAt': str(member['CreatedAt']),
        'Address': member.get('Address', ''),
        'ShowAddress': bool(member.get('ShowAddress', False)),
        'avatarColor': member['AvatarColor'],
        'isAdmin': bool(member['IsAdmin']),
        'AllowQnA': allow_qna,
    }

    # Subtype details
    if member['MemberType'] == 'Student':
        sub = query_db("SELECT * FROM Student WHERE MemberID = %s", (member_id,), one=True)
        if sub:
            user.update({
                'Programme': sub['Programme'],
                'Branch': sub['Branch'],
                'CurrentYear': sub['CurrentYear'],
                'MessAssignment': sub['MessAssignment'],
            })
    elif member['MemberType'] == 'Professor':
        sub = query_db("SELECT * FROM Professor WHERE MemberID = %s", (member_id,), one=True)
        if sub:
            user.update({
                'Designation': sub['Designation'],
                'Department': sub['Department'],
                'JoiningDate': str(sub['JoiningDate']),
            })
    elif member['MemberType'] == 'Alumni':
        sub = query_db("SELECT * FROM Alumni WHERE MemberID = %s", (member_id,), one=True)
        if sub:
            user.update({
                'CurrentOrganization': sub['CurrentOrganization'],
                'GraduationYear': sub['GraduationYear'],
                'Verified': bool(sub['Verified']),
            })
    elif member['MemberType'] == 'Organization':
        sub = query_db("SELECT * FROM Organization WHERE MemberID = %s", (member_id,), one=True)
        if sub:
            user.update({
                'OrgType': sub['OrgType'],
                'FoundationDate': str(sub['FoundationDate']),
                'ContactEmail': sub['ContactEmail'],
            })

    # Posts by this member
    posts = query_db("""
        SELECT p.*,
               (SELECT COUNT(*) FROM PostLike WHERE PostID = p.PostID) AS likes,
               (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID) AS commentCount,
               g.Name AS GroupName
        FROM Post p
        LEFT JOIN CampusGroup g ON p.GroupID = g.GroupID
        WHERE p.AuthorID = %s
        ORDER BY p.CreatedAt DESC
        LIMIT 10
    """, (member_id,))

    user['posts'] = [{
        'PostID': p['PostID'],
        'Content': p['Content'],
        'CreatedAt': str(p['CreatedAt']),
        'likes': p['likes'],
        'commentCount': p['commentCount'],
        'GroupID': p['GroupID'],
        'GroupName': p['GroupName'],
    } for p in posts]

    # Groups
    groups = query_db("""
        SELECT g.GroupID, g.Name, gm.Role
        FROM GroupMembership gm
        JOIN CampusGroup g ON gm.GroupID = g.GroupID
        WHERE gm.MemberID = %s
    """, (member_id,))
    user['groups'] = [{'GroupID': g['GroupID'], 'Name': g['Name'], 'Role': g['Role']} for g in groups]

    return jsonify(user)


@profile_bp.route('/profile/<int:member_id>/claims', methods=['GET'])
@jwt_required()
def get_claims(member_id):
    user_id = int(get_jwt_identity())
    claims = query_db("""
        SELECT pcq.*,
               (SELECT COUNT(*) FROM ProfileClaimVote WHERE ClaimID = pcq.ClaimID AND IsAgree = TRUE) AS agreeCount,
               (SELECT COUNT(*) FROM ProfileClaimVote WHERE ClaimID = pcq.ClaimID AND IsAgree = FALSE) AS disagreeCount
        FROM ProfileClaimQuestion pcq
        WHERE pcq.MemberID = %s
        ORDER BY pcq.ClaimID
    """, (member_id,))

    result = []
    for c in claims:
        user_vote = query_db(
            "SELECT IsAgree FROM ProfileClaimVote WHERE ClaimID = %s AND VoterID = %s",
            (c['ClaimID'], user_id), one=True,
        )
        result.append({
            'ClaimID': c['ClaimID'],
            'MemberID': c['MemberID'],
            'QuestionText': c['QuestionText'],
            'UserResponse': c['UserResponse'],
            'agreeCount': c['agreeCount'],
            'disagreeCount': c['disagreeCount'],
            'userVote': user_vote['IsAgree'] if user_vote else None,
        })
    return jsonify(result)


@profile_bp.route('/profile/<int:member_id>/claims', methods=['POST'])
@jwt_required()
def create_claim(member_id):
    user_id = int(get_jwt_identity())
    if user_id != member_id:
        return jsonify(error='Can only add claims to your own profile'), 403

    data = request.get_json()
    question = data.get('questionText', '').strip()
    response = data.get('userResponse', '').strip()

    if not question or not response:
        return jsonify(error='Question and response required'), 400

    claim_id = execute_db(
        "INSERT INTO ProfileClaimQuestion (MemberID, QuestionText, UserResponse) VALUES (%s,%s,%s)",
        (member_id, question, response),
    )
    log_action('CREATE_CLAIM', f"Created profile claim {claim_id} for member {member_id}", user=get_current_username())
    return jsonify(claimId=claim_id), 201


@profile_bp.route('/claims/<int:claim_id>', methods=['PUT'])
@jwt_required()
def update_claim(claim_id):
    user_id = int(get_jwt_identity())
    claim = query_db("SELECT * FROM ProfileClaimQuestion WHERE ClaimID = %s", (claim_id,), one=True)
    if not claim:
        return jsonify(error='Claim not found'), 404
    if claim['MemberID'] != user_id:
        return jsonify(error='Unauthorized'), 403

    data = request.get_json()
    execute_db(
        "UPDATE ProfileClaimQuestion SET QuestionText = %s, UserResponse = %s WHERE ClaimID = %s",
        (data.get('questionText', claim['QuestionText']), data.get('userResponse', claim['UserResponse']), claim_id),
    )
    log_action('UPDATE_CLAIM', f"Updated profile claim {claim_id}", user=get_current_username())
    return jsonify(message='Claim updated')


@profile_bp.route('/claims/<int:claim_id>', methods=['DELETE'])
@jwt_required()
def delete_claim(claim_id):
    user_id = int(get_jwt_identity())
    claim = query_db("SELECT * FROM ProfileClaimQuestion WHERE ClaimID = %s", (claim_id,), one=True)
    if not claim:
        return jsonify(error='Claim not found'), 404
    if claim['MemberID'] != user_id:
        return jsonify(error='Unauthorized'), 403

    execute_db("DELETE FROM ProfileClaimQuestion WHERE ClaimID = %s", (claim_id,))
    log_action('DELETE_CLAIM', f"Deleted profile claim {claim_id}", user=get_current_username())
    return jsonify(message='Claim deleted')


@profile_bp.route('/claims/<int:claim_id>/vote', methods=['POST'])
@jwt_required()
def vote_claim(claim_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    is_agree = data.get('isAgree')

    if is_agree is None:
        return jsonify(error='isAgree required'), 400

    # Upsert vote
    existing = query_db(
        "SELECT * FROM ProfileClaimVote WHERE ClaimID = %s AND VoterID = %s",
        (claim_id, user_id), one=True,
    )
    if existing:
        if existing['IsAgree'] == is_agree:
            # Toggle off
            execute_db("DELETE FROM ProfileClaimVote WHERE ClaimID = %s AND VoterID = %s", (claim_id, user_id))
            log_action('REMOVE_CLAIM_VOTE', f"Removed vote on claim {claim_id}", user=get_current_username())
            return jsonify(message='Vote removed')
        else:
            execute_db(
                "UPDATE ProfileClaimVote SET IsAgree = %s WHERE ClaimID = %s AND VoterID = %s",
                (is_agree, claim_id, user_id),
            )
            log_action('UPDATE_CLAIM_VOTE', f"Updated vote on claim {claim_id} to {'agree' if is_agree else 'disagree'}", user=get_current_username())
            return jsonify(message='Vote updated')
    else:
        execute_db(
            "INSERT INTO ProfileClaimVote (ClaimID, VoterID, IsAgree) VALUES (%s,%s,%s)",
            (claim_id, user_id, is_agree),
        )
        log_action('VOTE_CLAIM', f"Voted {'agree' if is_agree else 'disagree'} on claim {claim_id}", user=get_current_username())
        return jsonify(message='Vote recorded')
