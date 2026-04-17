from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from shard_db import query_all_shards, execute_shard, execute_all_shards, get_shard_for_member
from audit import log_action, get_current_username

posts_bp = Blueprint('posts', __name__)


@posts_bp.route('/posts', methods=['GET'])
@jwt_required()
def get_posts():
    feed = request.args.get('feed', 'global')
    user_id = int(get_jwt_identity())

    if feed == 'groups':
        rows = query_all_shards("""
            SELECT p.*, m.Username, m.Name, m.MemberType, m.AvatarColor,
                   g.Name AS GroupName,
                   (SELECT COUNT(*) FROM PostLike WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID) AS commentCount
            FROM Post p
            JOIN Member m ON p.AuthorID = m.MemberID
            LEFT JOIN CampusGroup g ON p.GroupID = g.GroupID
            WHERE p.GroupID IN (SELECT GroupID FROM GroupMembership WHERE MemberID = %s)
            ORDER BY p.CreatedAt DESC
        """, (user_id,))
    else:
        rows = query_all_shards("""
            SELECT p.*, m.Username, m.Name, m.MemberType, m.AvatarColor,
                   g.Name AS GroupName,
                   (SELECT COUNT(*) FROM PostLike WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID) AS commentCount
            FROM Post p
            JOIN Member m ON p.AuthorID = m.MemberID
            LEFT JOIN CampusGroup g ON p.GroupID = g.GroupID
            WHERE p.GroupID IS NULL
            ORDER BY p.CreatedAt DESC
        """)
        
    rows.sort(key=lambda x: str(x['CreatedAt']), reverse=True)

    # Check if current user liked each post
    liked_posts = {r['PostID'] for r in query_all_shards(
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
            'groupName': r['GroupName'],
        })
    return jsonify(result)


@posts_bp.route('/posts', methods=['POST'])
@jwt_required()
def create_post():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get('content', '').strip()
    group_id = data.get('groupId')
    image_url = data.get('imageUrl')

    if not content and not image_url:
        return jsonify(error='Content or image is required'), 400

    shard_id = get_shard_for_member(user_id)
    post_id = execute_shard(shard_id,
        "INSERT INTO Post (AuthorID, GroupID, Content, ImageURL, CreatedAt) VALUES (%s,%s,%s,%s, NOW())",
        (user_id, group_id, content, image_url),
    )
    log_action('CREATE_POST', f"Created post {post_id} in group {group_id}", user=get_current_username())
    return jsonify(postId=post_id), 201


@posts_bp.route('/posts/<int:post_id>', methods=['PUT'])
@jwt_required()
def update_post(post_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get('content', '').strip()

    post = query_all_shards("SELECT * FROM Post WHERE PostID = %s", (post_id,))
    post = post[0] if post else None
    
    if not post:
        return jsonify(error='Post not found'), 404
    if post['AuthorID'] != user_id:
        return jsonify(error='Unauthorized'), 403

    shard_id = get_shard_for_member(user_id)
    execute_shard(shard_id, "UPDATE Post SET Content = %s WHERE PostID = %s", (content, post_id))
    log_action('UPDATE_POST', f"Updated post {post_id}", user=get_current_username())
    return jsonify(message='Post updated')


@posts_bp.route('/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    user_id = int(get_jwt_identity())
    post = query_all_shards("SELECT * FROM Post WHERE PostID = %s", (post_id,))
    post = post[0] if post else None
    
    if not post:
        return jsonify(error='Post not found'), 404

    member = query_all_shards("SELECT IsAdmin FROM Member WHERE MemberID = %s", (user_id,))
    member = member[0] if member else {}
    
    if post['AuthorID'] != user_id and not member.get('IsAdmin'):
        return jsonify(error='Unauthorized'), 403

    shard_id = get_shard_for_member(post['AuthorID'])
    execute_shard(shard_id, "DELETE FROM Post WHERE PostID = %s", (post_id,))
    log_action('DELETE_POST', f"Deleted post {post_id}", user=get_current_username())
    return jsonify(message='Post deleted')


@posts_bp.route('/posts/<int:post_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(post_id):
    rows = query_all_shards("""
        SELECT c.*, m.Username, m.Name, m.MemberType, m.AvatarColor
        FROM Comment c
        JOIN Member m ON c.AuthorID = m.MemberID
        WHERE c.PostID = %s
        ORDER BY c.CreatedAt ASC
    """, (post_id,))
    rows.sort(key=lambda x: str(x['CreatedAt']))

    result = []
    for r in rows:
        result.append({
            'CommentID': r['CommentID'],
            'PostID': r['PostID'],
            'AuthorID': r['AuthorID'],
            'Content': r['Content'],
            'CreatedAt': str(r['CreatedAt']),
            'author': {
                'MemberID': r['AuthorID'],
                'Username': r['Username'],
                'Name': r['Name'],
                'MemberType': r['MemberType'],
                'avatarColor': r['AvatarColor'],
            },
        })
    return jsonify(result)


@posts_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
@jwt_required()
def create_comment(post_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get('content', '').strip()

    if not content:
        return jsonify(error='Content is required'), 400

    shard_id = get_shard_for_member(user_id)
    comment_id = execute_shard(shard_id,
        "INSERT INTO Comment (PostID, AuthorID, Content, CreatedAt) VALUES (%s,%s,%s, NOW())",
        (post_id, user_id, content),
    )
    log_action('CREATE_COMMENT', f"Created comment {comment_id} on post {post_id}", user=get_current_username())
    return jsonify(commentId=comment_id), 201


@posts_bp.route('/comments/<int:comment_id>', methods=['PUT'])
@jwt_required()
def update_comment(comment_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get('content', '').strip()

    comment = query_all_shards("SELECT * FROM Comment WHERE CommentID = %s", (comment_id,))
    comment = comment[0] if comment else None
    
    if not comment:
        return jsonify(error='Comment not found'), 404
    if comment['AuthorID'] != user_id:
        return jsonify(error='Unauthorized'), 403

    shard_id = get_shard_for_member(comment['AuthorID'])
    execute_shard(shard_id, "UPDATE Comment SET Content = %s WHERE CommentID = %s", (content, comment_id))
    log_action('UPDATE_COMMENT', f"Updated comment {comment_id}", user=get_current_username())
    return jsonify(message='Comment updated')


@posts_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = int(get_jwt_identity())
    comment = query_all_shards("SELECT * FROM Comment WHERE CommentID = %s", (comment_id,))
    comment = comment[0] if comment else None
    
    if not comment:
        return jsonify(error='Comment not found'), 404

    member = query_all_shards("SELECT IsAdmin FROM Member WHERE MemberID = %s", (user_id,))
    member = member[0] if member else {}
    if comment['AuthorID'] != user_id and not member.get('IsAdmin'):
        return jsonify(error='Unauthorized'), 403

    shard_id = get_shard_for_member(comment['AuthorID'])
    execute_shard(shard_id, "DELETE FROM Comment WHERE CommentID = %s", (comment_id,))
    log_action('DELETE_COMMENT', f"Deleted comment {comment_id}", user=get_current_username())
    return jsonify(message='Comment deleted')


@posts_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
def toggle_like(post_id):
    user_id = int(get_jwt_identity())
    shard_id = get_shard_for_member(user_id)
    existing = query_shard(shard_id,
        "SELECT * FROM PostLike WHERE PostID = %s AND MemberID = %s", (post_id, user_id)
    )
    if existing:
        execute_shard(shard_id, "DELETE FROM PostLike WHERE PostID = %s AND MemberID = %s", (post_id, user_id))
        log_action('UNLIKE_POST', f"Unliked post {post_id}", user=get_current_username())
        return jsonify(liked=False)
    else:
        shard_id = get_shard_for_member(user_id)
        execute_shard(shard_id, "INSERT INTO PostLike (PostID, MemberID) VALUES (%s,%s)", (post_id, user_id))
        log_action('LIKE_POST', f"Liked post {post_id}", user=get_current_username())
        return jsonify(liked=True)
