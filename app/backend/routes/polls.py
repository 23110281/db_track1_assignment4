from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from shard_db import (
    query_shard,
    query_all_shards,
    execute_shard,
    execute_all_shards,
    get_shard_for_member,
    insert_replicated_row,
)
from audit import log_action, get_current_username

polls_bp = Blueprint('polls', __name__)


@polls_bp.route('/', methods=['GET'])
@jwt_required()
def get_polls():
    user_id = int(get_jwt_identity())
    polls = query_all_shards("""
        SELECT p.*, m.Name AS CreatorName, m.AvatarColor
        FROM Poll p
        JOIN Member m ON p.CreatorID = m.MemberID
        ORDER BY p.CreatedAt DESC
    """)

    # Poll table is replicated, so dedupe by PollID after fan-out.
    unique_polls = {}
    for poll in polls:
        unique_polls[poll['PollID']] = poll

    result = []
    for poll in sorted(unique_polls.values(), key=lambda p: str(p['CreatedAt']), reverse=True):
        options_rows = query_all_shards("""
            SELECT po.OptionID, po.OptionText,
                   (SELECT COUNT(*) FROM PollVote WHERE OptionID = po.OptionID) AS votes
            FROM PollOption po
            WHERE po.PollID = %s
            ORDER BY po.OptionID
        """, (poll['PollID'],))

        options_agg = {}
        for opt in options_rows:
            if opt['OptionID'] not in options_agg:
                options_agg[opt['OptionID']] = {
                    'OptionID': opt['OptionID'],
                    'OptionText': opt['OptionText'],
                    'votes': 0,
                }
            options_agg[opt['OptionID']]['votes'] += opt['votes']
        options = sorted(options_agg.values(), key=lambda x: x['OptionID'])

        # Check if user already voted on this poll
        user_shard = get_shard_for_member(user_id)
        user_vote = query_shard(user_shard, """
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

    poll_id = insert_replicated_row(
        "INSERT INTO Poll (CreatorID, Question, CreatedAt, ExpiresAt) VALUES (%s,%s, NOW(),%s)",
        (user_id, question, expires_str),
    )
    for opt in options:
        insert_replicated_row(
            "INSERT INTO PollOption (PollID, OptionText) VALUES (%s,%s)",
            (poll_id, opt),
        )
    log_action('CREATE_POLL', f"Created poll {poll_id}: '{question}' with {len(options)} options", user=get_current_username())
    return jsonify(pollId=poll_id), 201


@polls_bp.route('/<int:poll_id>', methods=['PUT'])
@jwt_required()
def update_poll(poll_id):
    user_id = int(get_jwt_identity())
    poll_rows = query_all_shards("SELECT * FROM Poll WHERE PollID = %s", (poll_id,))
    poll = poll_rows[0] if poll_rows else None
    if not poll:
        return jsonify(error='Poll not found'), 404
    user_shard = get_shard_for_member(user_id)
    member = query_shard(user_shard, "SELECT IsAdmin FROM Member WHERE MemberID = %s", (user_id,), one=True)
    is_admin = member and member['IsAdmin']
    if poll['CreatorID'] != user_id and not is_admin:
        return jsonify(error='Unauthorized'), 403

    data = request.get_json()
    question = data.get('question', '').strip()
    options = data.get('options', None)
    if not question:
        return jsonify(error='Question is required'), 400

    execute_all_shards("UPDATE Poll SET Question = %s WHERE PollID = %s", (question, poll_id))

    # If options are provided, replace them (delete votes + old options, insert new)
    if options is not None and len(options) >= 2:
        execute_all_shards(
            "DELETE FROM PollVote WHERE OptionID IN (SELECT OptionID FROM PollOption WHERE PollID = %s)",
            (poll_id,),
        )
        execute_all_shards("DELETE FROM PollOption WHERE PollID = %s", (poll_id,))
        for opt in options:
            if opt.strip():
                insert_replicated_row("INSERT INTO PollOption (PollID, OptionText) VALUES (%s,%s)", (poll_id, opt.strip()))

    log_action('UPDATE_POLL', f"Updated poll {poll_id}: '{question}'", user=get_current_username())
    return jsonify(message='Poll updated')


@polls_bp.route('/<int:poll_id>', methods=['DELETE'])
@jwt_required()
def delete_poll(poll_id):
    user_id = int(get_jwt_identity())
    poll_rows = query_all_shards("SELECT * FROM Poll WHERE PollID = %s", (poll_id,))
    poll = poll_rows[0] if poll_rows else None
    if not poll:
        return jsonify(error='Poll not found'), 404
    user_shard = get_shard_for_member(user_id)
    member = query_shard(user_shard, "SELECT IsAdmin FROM Member WHERE MemberID = %s", (user_id,), one=True)
    is_admin = member and member['IsAdmin']
    if poll['CreatorID'] != user_id and not is_admin:
        return jsonify(error='Unauthorized'), 403

    execute_all_shards(
        "DELETE FROM PollVote WHERE OptionID IN (SELECT OptionID FROM PollOption WHERE PollID = %s)",
        (poll_id,),
    )
    execute_all_shards("DELETE FROM PollOption WHERE PollID = %s", (poll_id,))
    execute_all_shards("DELETE FROM Poll WHERE PollID = %s", (poll_id,))
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
    opt_rows = query_all_shards(
        "SELECT * FROM PollOption WHERE OptionID = %s AND PollID = %s",
        (option_id, poll_id),
    )
    opt = opt_rows[0] if opt_rows else None
    if not opt:
        return jsonify(error='Invalid option'), 400

    user_shard = get_shard_for_member(user_id)
    execute_shard(
        user_shard,
        "DELETE FROM PollVote WHERE MemberID = %s AND OptionID IN (SELECT OptionID FROM PollOption WHERE PollID = %s)",
        (user_id, poll_id),
    )
    execute_shard(user_shard, "INSERT INTO PollVote (OptionID, MemberID) VALUES (%s,%s)", (option_id, user_id))
    log_action('VOTE_POLL', f"Voted on poll {poll_id}, option {option_id}", user=get_current_username())
    return jsonify(message='Vote recorded')


@polls_bp.route('/<int:poll_id>/unvote', methods=['POST'])
@jwt_required()
def unvote_poll(poll_id):
    user_id = int(get_jwt_identity())
    user_shard = get_shard_for_member(user_id)
    execute_shard(user_shard, """
        DELETE FROM PollVote WHERE MemberID = %s AND OptionID IN
        (SELECT OptionID FROM PollOption WHERE PollID = %s)
    """, (user_id, poll_id))
    log_action('UNVOTE_POLL', f"Removed vote from poll {poll_id}", user=get_current_username())
    return jsonify(message='Vote removed')
