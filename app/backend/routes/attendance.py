from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db

attendance_bp = Blueprint('attendance', __name__)


@attendance_bp.route('/class', methods=['GET'])
@jwt_required()
def get_class_attendance():
    student_id = request.args.get('studentId', int(get_jwt_identity()))
    month = request.args.get('month', '03')
    year = request.args.get('year', '2026')

    records = query_db("""
        SELECT ca.AttendanceID, ca.CourseID, ca.RecordDate, ca.Status,
               c.CourseCode, c.CourseName
        FROM ClassAttendance ca
        JOIN Course c ON ca.CourseID = c.CourseID
        WHERE ca.StudentID = %s
          AND MONTH(ca.RecordDate) = %s
          AND YEAR(ca.RecordDate) = %s
        ORDER BY ca.RecordDate
    """, (student_id, month, year))

    # Course breakdown
    course_stats = {}
    for r in records:
        code = r['CourseCode']
        if code not in course_stats:
            course_stats[code] = {'CourseCode': code, 'CourseName': r['CourseName'], 'present': 0, 'absent': 0, 'total': 0}
        course_stats[code]['total'] += 1
        if r['Status'] == 'Present':
            course_stats[code]['present'] += 1
        else:
            course_stats[code]['absent'] += 1

    return jsonify({
        'records': [{
            'AttendanceID': r['AttendanceID'],
            'CourseID': r['CourseID'],
            'CourseCode': r['CourseCode'],
            'RecordDate': str(r['RecordDate']),
            'Status': r['Status'],
        } for r in records],
        'courseBreakdown': list(course_stats.values()),
    })


@attendance_bp.route('/mess', methods=['GET'])
@jwt_required()
def get_mess_attendance():
    student_id = request.args.get('studentId', int(get_jwt_identity()))
    month = request.args.get('month', '03')
    year = request.args.get('year', '2026')

    records = query_db("""
        SELECT * FROM MessAttendance
        WHERE StudentID = %s
          AND MONTH(RecordDate) = %s
          AND YEAR(RecordDate) = %s
        ORDER BY RecordDate, FIELD(MealType, 'Breakfast', 'Lunch', 'Dinner')
    """, (student_id, month, year))

    # Meal breakdown
    meal_stats = {'Breakfast': {'eaten': 0, 'missed': 0}, 'Lunch': {'eaten': 0, 'missed': 0}, 'Dinner': {'eaten': 0, 'missed': 0}}
    for r in records:
        mt = r['MealType']
        if r['Status'] == 'Eaten':
            meal_stats[mt]['eaten'] += 1
        else:
            meal_stats[mt]['missed'] += 1

    return jsonify({
        'records': [{
            'MessRecordID': r['MessRecordID'],
            'RecordDate': str(r['RecordDate']),
            'MealType': r['MealType'],
            'Status': r['Status'],
        } for r in records],
        'mealBreakdown': meal_stats,
    })


@attendance_bp.route('/streaks', methods=['GET'])
@jwt_required()
def get_streaks():
    student_id = request.args.get('studentId', int(get_jwt_identity()))

    # Class streak
    class_records = query_db("""
        SELECT RecordDate, Status FROM ClassAttendance
        WHERE StudentID = %s ORDER BY RecordDate DESC
    """, (student_id,))
    class_streak = 0
    for r in class_records:
        if r['Status'] == 'Present':
            class_streak += 1
        else:
            break

    # Mess streak
    mess_records = query_db("""
        SELECT RecordDate, Status FROM MessAttendance
        WHERE StudentID = %s ORDER BY RecordDate DESC, FIELD(MealType, 'Dinner', 'Lunch', 'Breakfast')
    """, (student_id,))
    mess_streak = 0
    for r in mess_records:
        if r['Status'] == 'Eaten':
            mess_streak += 1
        else:
            break

    return jsonify({
        'classStreak': class_streak,
        'messStreak': mess_streak,
    })


@attendance_bp.route('/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    students = query_db("SELECT s.MemberID FROM Student s JOIN Member m ON s.MemberID = m.MemberID WHERE m.IsAdmin = FALSE")

    leaderboard = []
    for s in students:
        sid = s['MemberID']
        member = query_db("SELECT Name, AvatarColor FROM Member WHERE MemberID = %s", (sid,), one=True)

        class_records = query_db(
            "SELECT Status FROM ClassAttendance WHERE StudentID = %s ORDER BY RecordDate DESC", (sid,)
        )
        class_streak = 0
        for r in class_records:
            if r['Status'] == 'Present':
                class_streak += 1
            else:
                break

        mess_records = query_db(
            "SELECT Status FROM MessAttendance WHERE StudentID = %s ORDER BY RecordDate DESC, FIELD(MealType, 'Dinner', 'Lunch', 'Breakfast')",
            (sid,),
        )
        mess_streak = 0
        for r in mess_records:
            if r['Status'] == 'Eaten':
                mess_streak += 1
            else:
                break

        leaderboard.append({
            'MemberID': sid,
            'Name': member['Name'] if member else 'Unknown',
            'avatarColor': member['AvatarColor'] if member else '#4F46E5',
            'classStreak': class_streak,
            'messStreak': mess_streak,
        })

    leaderboard.sort(key=lambda x: x['classStreak'], reverse=True)
    return jsonify(leaderboard)
