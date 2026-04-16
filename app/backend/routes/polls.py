from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from db import query_db, execute_db, execute_transaction
from audit import log_action, get_current_username

polls_bp = Blueprint('polls', __name__)


@polls_bp.route('/', methods=['GET'])
@jwt_required()
def get_polls():
    user_id = int(get_jwt_identity())
    polls = query_db("""
        SELECT p.*, m.Name AS CreatorName, m.AvatarColor
        FROM Poll p
        JOIN Member m ON p.CreatorID = m.MemberID
        ORDER BY p.CreatedAt DESC
    """)

    result = []
    for poll in polls:
        options = query_db("""
            SELECT po.OptionID, po.OptionText,
                   (SELECT COUNT(*) FROM PollVote WHERE OptionID = po.OptionID) AS votes
            FROM PollOption po
            WHERE po.PollID = %s
            ORDER BY po.OptionID
        """, (poll['PollID'],))

        # Check if user already voted on this poll
        user_vote = query_db("""
            SELECT pv.OptionID FROM PollVote pv
            JOIN PollOption po ON pv.OptionID = po.OptionID
            WHERE po.PollID = %s AND pv.MemberID = %s
        """, (poll['PollID'], user_id), one=True)

        result.append({
            'PollID': poll['PollID'],
            'CreatorID': poll['CreatorID'],
            'Question': poll['Question'],
            'CreatedAt': str(poll['CreatedAt']),
            'ExpiresAt': str(poll['ExpiresAt']),
            'CreatorName': poll['CreatorName'],
            'avatarColor': poll['AvatarColor'],
            'options': [{
                'OptionID': o['OptionID'],
                'OptionText': o['OptionText'],
                'votes': o['votes'],
            } for o in options],
            'userVotedOptionId': user_vote['OptionID'] if user_vote else None,
        })
    return jsonify(result)


@polls_bp.route('/', methods=['POST'])
@jwt_required()
def create_poll():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    question = data.get('question', '').strip()
    expires_at = data.get('expiresAt', '')
    options = data.get('options', [])

    if not question or len(options) < 2:
        return jsonify(error='Question and at least 2 options required'), 400

    # Parse ISO 8601 datetime to MySQL-compatible format
    try:
        expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        expires_str = expires_dt.strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, AttributeError):
        expires_str = expires_at  # fallback

    poll_id = execute_db(
        "INSERT INTO Poll (CreatorID, Question, CreatedAt, ExpiresAt) VALUES (%s,%s, NOW(),%s)",
        (user_id, question, expires_str),
    )
    for opt in options:
        execute_db(
            "INSERT INTO PollOption (PollID, OptionText) VALUES (%s,%s)",
            (poll_id, opt),
        )
    log_action('CREATE_POLL', f"Created poll {poll_id}: '{question}' with {len(options)} options", user=get_current_username())
    return jsonify(pollId=poll_id), 201


@polls_bp.route('/<int:poll_id>', methods=['PUT'])
@jwt_required()
def update_poll(poll_id):
    user_id = int(get_jwt_identity())
    poll = query_db("SELECT * FROM Poll WHERE PollID = %s", (poll_id,), one=True)
    if not poll:
        return jsonify(error='Poll not found'), 404
    member = query_db("SELECT IsAdmin FROM Member WHERE MemberID = %s", (user_id,), one=True)
    is_admin = member and member['IsAdmin']
    if poll['CreatorID'] != user_id and not is_admin:
        return jsonify(error='Unauthorized'), 403

    data = request.get_json()
    question = data.get('question', '').strip()
    options = data.get('options', None)
    if not question:
        return jsonify(error='Question is required'), 400

    # Build all statements for a single transaction
    stmts = [("UPDATE Poll SET Question = %s WHERE PollID = %s", (question, poll_id))]

    # If options are provided, replace them (delete votes + old options, insert new)
    if options is not None and len(options) >= 2:
        stmts.append(("DELETE FROM PollVote WHERE OptionID IN (SELECT OptionID FROM PollOption WHERE PollID = %s)", (poll_id,)))
        stmts.append(("DELETE FROM PollOption WHERE PollID = %s", (poll_id,)))
        for opt in options:
            if opt.strip():
                stmts.append(("INSERT INTO PollOption (PollID, OptionText) VALUES (%s,%s)", (poll_id, opt.strip())))

    execute_transaction(stmts)

    log_action('UPDATE_POLL', f"Updated poll {poll_id}: '{question}'", user=get_current_username())
    return jsonify(message='Poll updated')


@polls_bp.route('/<int:poll_id>', methods=['DELETE'])
@jwt_required()
def delete_poll(poll_id):
    user_id = int(get_jwt_identity())
    poll = query_db("SELECT * FROM Poll WHERE PollID = %s", (poll_id,), one=True)
    if not poll:
        return jsonify(error='Poll not found'), 404
    member = query_db("SELECT IsAdmin FROM Member WHERE MemberID = %s", (user_id,), one=True)
    is_admin = member and member['IsAdmin']
    if poll['CreatorID'] != user_id and not is_admin:
        return jsonify(error='Unauthorized'), 403

    # Delete votes, options, then poll in single transaction
    execute_transaction([
        ("DELETE FROM PollVote WHERE OptionID IN (SELECT OptionID FROM PollOption WHERE PollID = %s)", (poll_id,)),
        ("DELETE FROM PollOption WHERE PollID = %s", (poll_id,)),
        ("DELETE FROM Poll WHERE PollID = %s", (poll_id,)),
    ])
    log_action('DELETE_POLL', f"Deleted poll {poll_id}", user=get_current_username())
    return jsonify(message='Poll deleted')


@polls_bp.route('/<int:poll_id>/vote', methods=['POST'])
@jwt_required()
def vote_poll(poll_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    option_id = data.get('optionId')

    if not option_id:
        return jsonify(error='optionId required'), 400

    # Check option belongs to this poll
    opt = query_db(
        "SELECT * FROM PollOption WHERE OptionID = %s AND PollID = %s",
        (option_id, poll_id), one=True,
    )
    if not opt:
        return jsonify(error='Invalid option'), 400

    # Remove any existing vote and insert new one in a single transaction
    execute_transaction([
        ("DELETE FROM PollVote WHERE MemberID = %s AND OptionID IN (SELECT OptionID FROM PollOption WHERE PollID = %s)", (user_id, poll_id)),
        ("INSERT INTO PollVote (OptionID, MemberID) VALUES (%s,%s)", (option_id, user_id)),
    ])
    log_action('VOTE_POLL', f"Voted on poll {poll_id}, option {option_id}", user=get_current_username())
    return jsonify(message='Vote recorded')


@polls_bp.route('/<int:poll_id>/unvote', methods=['POST'])
@jwt_required()
def unvote_poll(poll_id):
    user_id = int(get_jwt_identity())
    execute_db("""
        DELETE FROM PollVote WHERE MemberID = %s AND OptionID IN
        (SELECT OptionID FROM PollOption WHERE PollID = %s)
    """, (user_id, poll_id))
    log_action('UNVOTE_POLL', f"Removed vote from poll {poll_id}", user=get_current_username())
    return jsonify(message='Vote removed')
