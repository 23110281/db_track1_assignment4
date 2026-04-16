from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db
from audit import log_action, get_current_username

jobs_bp = Blueprint('jobs', __name__)


@jobs_bp.route('/jobs', methods=['GET'])
@jwt_required()
def get_jobs():
    rows = query_db("""
        SELECT j.*, m.Name AS AlumniName, m.AvatarColor,
               a.CurrentOrganization
        FROM JobPost j
        JOIN Member m ON j.AlumniID = m.MemberID
        JOIN Alumni a ON j.AlumniID = a.MemberID
        ORDER BY j.PostedAt DESC
    """)
    result = []
    for r in rows:
        result.append({
            'JobID': r['JobID'],
            'AlumniID': r['AlumniID'],
            'Title': r['Title'],
            'Company': r['Company'],
            'Description': r['Description'],
            'ApplicationLink': r['ApplicationLink'],
            'PostedAt': str(r['PostedAt']),
            'AlumniName': r['AlumniName'],
            'avatarColor': r['AvatarColor'],
        })
    return jsonify(result)


@jobs_bp.route('/jobs', methods=['POST'])
@jwt_required()
def create_job():
    user_id = int(get_jwt_identity())
    member = query_db("SELECT MemberType FROM Member WHERE MemberID = %s", (user_id,), one=True)
    if not member or member['MemberType'] != 'Alumni':
        return jsonify(error='Only alumni can post jobs'), 403

    data = request.get_json()
    title = data.get('title', '').strip()
    company = data.get('company', '').strip()
    description = data.get('description', '').strip()
    link = data.get('applicationLink', '').strip()

    if not all([title, company, description]):
        return jsonify(error='Title, company, and description are required'), 400

    job_id = execute_db(
        "INSERT INTO JobPost (AlumniID, Title, Company, Description, ApplicationLink, PostedAt) VALUES (%s,%s,%s,%s,%s, NOW())",
        (user_id, title, company, description, link or None),
    )
    log_action('CREATE_JOB', f"Created job posting {job_id}: '{title}' at {company}", user=get_current_username())
    return jsonify(jobId=job_id), 201


@jobs_bp.route('/jobs/<int:job_id>', methods=['PUT'])
@jwt_required()
def update_job(job_id):
    user_id = int(get_jwt_identity())
    job = query_db("SELECT * FROM JobPost WHERE JobID = %s", (job_id,), one=True)
    if not job:
        return jsonify(error='Job not found'), 404
    if job['AlumniID'] != user_id:
        return jsonify(error='Unauthorized'), 403

    data = request.get_json()
    execute_db("""
        UPDATE JobPost SET Title=%s, Company=%s, Description=%s, ApplicationLink=%s
        WHERE JobID = %s
    """, (
        data.get('title', job['Title']),
        data.get('company', job['Company']),
        data.get('description', job['Description']),
        data.get('applicationLink', job['ApplicationLink']),
        job_id,
    ))
    log_action('UPDATE_JOB', f"Updated job posting {job_id}", user=get_current_username())
    return jsonify(message='Job updated')


@jobs_bp.route('/jobs/<int:job_id>', methods=['DELETE'])
@jwt_required()
def delete_job(job_id):
    user_id = int(get_jwt_identity())
    job = query_db("SELECT * FROM JobPost WHERE JobID = %s", (job_id,), one=True)
    if not job:
        return jsonify(error='Job not found'), 404
    member = query_db("SELECT IsAdmin FROM Member WHERE MemberID = %s", (user_id,), one=True)
    is_admin = member and member['IsAdmin']
    if job['AlumniID'] != user_id and not is_admin:
        return jsonify(error='Unauthorized'), 403

    execute_db("DELETE FROM JobPost WHERE JobID = %s", (job_id,))
    log_action('DELETE_JOB', f"Deleted job posting {job_id}", user=get_current_username())
    return jsonify(message='Job deleted')


@jobs_bp.route('/referrals', methods=['GET'])
@jwt_required()
def get_referrals():
    user_id = int(get_jwt_identity())
    member = query_db("SELECT MemberType FROM Member WHERE MemberID = %s", (user_id,), one=True)

    if member and member['MemberType'] == 'Alumni':
        rows = query_db("""
            SELECT r.*, m.Name AS StudentName
            FROM ReferralRequest r
            JOIN Member m ON r.StudentID = m.MemberID
            WHERE r.TargetAlumniID = %s
            ORDER BY r.RequestedAt DESC
        """, (user_id,))
    else:
        rows = query_db("""
            SELECT r.*, m.Name AS AlumniName
            FROM ReferralRequest r
            JOIN Member m ON r.TargetAlumniID = m.MemberID
            WHERE r.StudentID = %s
            ORDER BY r.RequestedAt DESC
        """, (user_id,))

    result = []
    for r in rows:
        item = {
            'RequestID': r['RequestID'],
            'StudentID': r['StudentID'],
            'TargetAlumniID': r['TargetAlumniID'],
            'TargetCompany': r['TargetCompany'],
            'TargetRole': r['TargetRole'],
            'JobPostingURL': r['JobPostingURL'],
            'Status': r['Status'],
            'RequestedAt': str(r['RequestedAt']),
        }
        if 'StudentName' in r:
            item['StudentName'] = r['StudentName']
        if 'AlumniName' in r:
            item['AlumniName'] = r['AlumniName']
        result.append(item)
    return jsonify(result)


@jobs_bp.route('/referrals', methods=['POST'])
@jwt_required()
def create_referral():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    referral_id = execute_db("""
        INSERT INTO ReferralRequest (StudentID, TargetAlumniID, TargetCompany, TargetRole, JobPostingURL, Status, RequestedAt)
        VALUES (%s,%s,%s,%s,%s,'Pending', NOW())
    """, (
        user_id,
        data.get('targetAlumniId'),
        data.get('targetCompany', ''),
        data.get('targetRole', ''),
        data.get('jobPostingUrl', ''),
    ))
    log_action('CREATE_REFERRAL', f"Created referral request {referral_id} for {data.get('targetCompany', '')} - {data.get('targetRole', '')}", user=get_current_username())
    return jsonify(requestId=referral_id), 201


@jobs_bp.route('/referrals/<int:request_id>', methods=['PUT'])
@jwt_required()
def update_referral(request_id):
    user_id = int(get_jwt_identity())
    ref = query_db("SELECT * FROM ReferralRequest WHERE RequestID = %s", (request_id,), one=True)
    if not ref:
        return jsonify(error='Referral not found'), 404
    if ref['TargetAlumniID'] != user_id:
        return jsonify(error='Unauthorized'), 403

    data = request.get_json()
    status = data.get('status')
    if status not in ('Approved', 'Rejected'):
        return jsonify(error='Invalid status'), 400

    execute_db("UPDATE ReferralRequest SET Status = %s WHERE RequestID = %s", (status, request_id))
    log_action('UPDATE_REFERRAL', f"Updated referral {request_id} status to {status}", user=get_current_username())
    return jsonify(message='Referral updated')
