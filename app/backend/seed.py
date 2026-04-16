"""
Seed script for IITGN Connect database.
Creates all tables and inserts mock data.
Run: python seed.py
"""

import mysql.connector
from werkzeug.security import generate_password_hash
import config
import random

random.seed(42)  # deterministic attendance data


def get_root_conn():
    return mysql.connector.connect(
        host=config.MYSQL_HOST,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
    )


def run():
    # --- Create database ---
    conn = get_root_conn()
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{config.MYSQL_DB}`")
    cursor.execute(f"USE `{config.MYSQL_DB}`")

    # --- Drop tables in reverse dependency order ---
    drops = [
        'AuditLog',
        'ProfileClaimVote', 'ProfileClaimQuestion',
        'ReferralRequest', 'JobPost',
        'PollVote', 'PollOption', 'Poll',
        'PostLike', 'Comment', 'Post',
        'GroupMembership', 'CampusGroup',
        'MessAttendance', 'ClassAttendance',
        'Enrollment', 'Course',
        'Organization', 'Alumni', 'Professor', 'Student', 'Member',
    ]
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    for t in drops:
        cursor.execute(f"DROP TABLE IF EXISTS `{t}`")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

    # --- Create tables ---
    cursor.execute("""
        CREATE TABLE Member (
            MemberID INT AUTO_INCREMENT PRIMARY KEY,
            Username VARCHAR(50) UNIQUE NOT NULL,
            Name VARCHAR(100) NOT NULL,
            Email VARCHAR(100) UNIQUE NOT NULL,
            Password VARCHAR(256) NOT NULL,
            MemberType ENUM('Student','Professor','Alumni','Organization') NOT NULL,
            ContactNumber VARCHAR(15),
            CreatedAt DATE NOT NULL,
            Address VARCHAR(255) DEFAULT '',
            ShowAddress BOOLEAN DEFAULT FALSE,
            AvatarColor VARCHAR(10) DEFAULT '#4F46E5',
            IsAdmin BOOLEAN DEFAULT FALSE
        )
    """)

    cursor.execute("""
        CREATE TABLE Student (
            MemberID INT PRIMARY KEY,
            Programme VARCHAR(20) NOT NULL,
            Branch VARCHAR(50) NOT NULL,
            CurrentYear INT NOT NULL,
            MessAssignment VARCHAR(20),
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE Professor (
            MemberID INT PRIMARY KEY,
            Designation VARCHAR(50) NOT NULL,
            Department VARCHAR(50) NOT NULL,
            JoiningDate DATE NOT NULL,
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE Alumni (
            MemberID INT PRIMARY KEY,
            CurrentOrganization VARCHAR(100),
            GraduationYear INT NOT NULL,
            Verified BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE Organization (
            MemberID INT PRIMARY KEY,
            OrgType VARCHAR(50) NOT NULL,
            FoundationDate DATE NOT NULL,
            ContactEmail VARCHAR(100),
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE Course (
            CourseID INT AUTO_INCREMENT PRIMARY KEY,
            CourseCode VARCHAR(10) NOT NULL,
            CourseName VARCHAR(100) NOT NULL,
            CourseSlot VARCHAR(5),
            ProfessorID INT,
            FOREIGN KEY (ProfessorID) REFERENCES Professor(MemberID) ON DELETE SET NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE Enrollment (
            StudentID INT NOT NULL,
            CourseID INT NOT NULL,
            EnrollmentDate DATE NOT NULL,
            Semester VARCHAR(20) NOT NULL,
            Status ENUM('Active','Dropped','Completed') DEFAULT 'Active',
            PRIMARY KEY (StudentID, CourseID, Semester),
            FOREIGN KEY (StudentID) REFERENCES Student(MemberID) ON DELETE CASCADE,
            FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE ClassAttendance (
            AttendanceID INT AUTO_INCREMENT PRIMARY KEY,
            CourseID INT NOT NULL,
            StudentID INT NOT NULL,
            RecordDate DATE NOT NULL,
            Status ENUM('Present','Absent') NOT NULL,
            FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE,
            FOREIGN KEY (StudentID) REFERENCES Student(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE MessAttendance (
            MessRecordID INT AUTO_INCREMENT PRIMARY KEY,
            StudentID INT NOT NULL,
            RecordDate DATE NOT NULL,
            MealType ENUM('Breakfast','Lunch','Dinner') NOT NULL,
            Status ENUM('Eaten','Missed') NOT NULL,
            FOREIGN KEY (StudentID) REFERENCES Student(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE CampusGroup (
            GroupID INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(100) NOT NULL,
            Description TEXT,
            AdminID INT,
            IsRestricted BOOLEAN DEFAULT FALSE,
            CreatedAt DATE DEFAULT (CURDATE()),
            FOREIGN KEY (AdminID) REFERENCES Member(MemberID) ON DELETE SET NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE GroupMembership (
            GroupID INT NOT NULL,
            MemberID INT NOT NULL,
            Role ENUM('Admin','Moderator','Member') DEFAULT 'Member',
            Status ENUM('approved','pending','rejected') DEFAULT 'approved',
            JoinedAt DATE NOT NULL,
            PRIMARY KEY (GroupID, MemberID),
            FOREIGN KEY (GroupID) REFERENCES CampusGroup(GroupID) ON DELETE CASCADE,
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE Post (
            PostID INT AUTO_INCREMENT PRIMARY KEY,
            AuthorID INT NOT NULL,
            GroupID INT,
            Content TEXT NOT NULL,
            ImageURL VARCHAR(500),
            CreatedAt DATETIME NOT NULL,
            FOREIGN KEY (AuthorID) REFERENCES Member(MemberID) ON DELETE CASCADE,
            FOREIGN KEY (GroupID) REFERENCES CampusGroup(GroupID) ON DELETE SET NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE Comment (
            CommentID INT AUTO_INCREMENT PRIMARY KEY,
            PostID INT NOT NULL,
            AuthorID INT NOT NULL,
            Content TEXT NOT NULL,
            CreatedAt DATETIME NOT NULL,
            FOREIGN KEY (PostID) REFERENCES Post(PostID) ON DELETE CASCADE,
            FOREIGN KEY (AuthorID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE PostLike (
            PostID INT NOT NULL,
            MemberID INT NOT NULL,
            PRIMARY KEY (PostID, MemberID),
            FOREIGN KEY (PostID) REFERENCES Post(PostID) ON DELETE CASCADE,
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE Poll (
            PollID INT AUTO_INCREMENT PRIMARY KEY,
            CreatorID INT NOT NULL,
            Question TEXT NOT NULL,
            CreatedAt DATETIME NOT NULL,
            ExpiresAt DATETIME NOT NULL,
            FOREIGN KEY (CreatorID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE PollOption (
            OptionID INT AUTO_INCREMENT PRIMARY KEY,
            PollID INT NOT NULL,
            OptionText VARCHAR(200) NOT NULL,
            FOREIGN KEY (PollID) REFERENCES Poll(PollID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE PollVote (
            OptionID INT NOT NULL,
            MemberID INT NOT NULL,
            PRIMARY KEY (OptionID, MemberID),
            FOREIGN KEY (OptionID) REFERENCES PollOption(OptionID) ON DELETE CASCADE,
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE JobPost (
            JobID INT AUTO_INCREMENT PRIMARY KEY,
            AlumniID INT NOT NULL,
            Title VARCHAR(200) NOT NULL,
            Company VARCHAR(100) NOT NULL,
            Description TEXT,
            ApplicationLink VARCHAR(500),
            PostedAt DATETIME NOT NULL,
            FOREIGN KEY (AlumniID) REFERENCES Alumni(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE ReferralRequest (
            RequestID INT AUTO_INCREMENT PRIMARY KEY,
            StudentID INT NOT NULL,
            TargetAlumniID INT NOT NULL,
            TargetCompany VARCHAR(100) NOT NULL,
            TargetRole VARCHAR(100) NOT NULL,
            JobPostingURL VARCHAR(500),
            Status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
            RequestedAt DATETIME NOT NULL,
            FOREIGN KEY (StudentID) REFERENCES Student(MemberID) ON DELETE CASCADE,
            FOREIGN KEY (TargetAlumniID) REFERENCES Alumni(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE ProfileClaimQuestion (
            ClaimID INT AUTO_INCREMENT PRIMARY KEY,
            MemberID INT NOT NULL,
            QuestionText TEXT NOT NULL,
            UserResponse TEXT NOT NULL,
            FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE ProfileClaimVote (
            ClaimID INT NOT NULL,
            VoterID INT NOT NULL,
            IsAgree BOOLEAN NOT NULL,
            PRIMARY KEY (ClaimID, VoterID),
            FOREIGN KEY (ClaimID) REFERENCES ProfileClaimQuestion(ClaimID) ON DELETE CASCADE,
            FOREIGN KEY (VoterID) REFERENCES Member(MemberID) ON DELETE CASCADE
        )
    """)

    # --- Audit Log table ---
    cursor.execute("""
        CREATE TABLE AuditLog (
            LogID INT AUTO_INCREMENT PRIMARY KEY,
            Timestamp DATETIME DEFAULT NOW(),
            Username VARCHAR(100),
            Action VARCHAR(50),
            Endpoint VARCHAR(200),
            IPAddress VARCHAR(50),
            Details TEXT,
            IsAuthorized BOOLEAN DEFAULT TRUE
        )
    """)

    # --- Triggers for detecting unauthorized direct DB modifications ---
    # Covers INSERT, UPDATE, DELETE on ALL tables (except AuditLog itself).
    # When operations come through the Flask API, @app_username is set via
    # session variables → IsAuthorized = TRUE.
    # Direct SQL access (MySQL CLI, phpMyAdmin, scripts) won't have @app_username
    # set → logged as 'DIRECT_DB_ACCESS' with IsAuthorized = FALSE.

    trigger_tables = [
        # (table_name, pk_col, detail_col)
        ('Member',              'MemberID',      'Username'),
        ('Student',             'MemberID',      'MemberID'),
        ('Professor',           'MemberID',      'MemberID'),
        ('Alumni',              'MemberID',      'MemberID'),
        ('Organization',        'MemberID',      'MemberID'),
        ('Course',              'CourseID',       'CourseName'),
        ('Enrollment',          'StudentID',     'CourseID'),
        ('ClassAttendance',     'AttendanceID',  'StudentID'),
        ('MessAttendance',      'MessRecordID',  'StudentID'),
        ('CampusGroup',         'GroupID',        'Name'),
        ('GroupMembership',     'GroupID',        'MemberID'),
        ('Post',                'PostID',         'PostID'),
        ('Comment',             'CommentID',      'CommentID'),
        ('PostLike',            'PostID',         'MemberID'),
        ('Poll',                'PollID',         'Question'),
        ('PollOption',          'OptionID',       'OptionText'),
        ('PollVote',            'OptionID',       'MemberID'),
        ('JobPost',             'JobID',          'Title'),
        ('ReferralRequest',     'RequestID',      'StudentID'),
        ('ProfileClaimQuestion','ClaimID',        'ClaimID'),
        ('ProfileClaimVote',    'ClaimID',        'VoterID'),
    ]

    for table, pk, detail in trigger_tables:
        for op in ['INSERT', 'UPDATE', 'DELETE']:
            trig_name = f"trg_{table.lower()}_{op.lower()}_audit"
            cursor.execute(f"DROP TRIGGER IF EXISTS {trig_name}")

            if op == 'INSERT':
                ref = 'NEW'
                detail_expr = f"CONCAT('{table} inserted: ', NEW.{detail}, ' (PK: ', NEW.{pk}, ')')"
            elif op == 'UPDATE':
                ref = 'OLD'
                detail_expr = f"CONCAT('{table} updated: ', OLD.{detail}, ' (PK: ', OLD.{pk}, ')')"
            else:
                ref = 'OLD'
                detail_expr = f"CONCAT('{table} deleted: ', OLD.{detail}, ' (PK: ', OLD.{pk}, ')')"

            timing = 'AFTER' if op == 'INSERT' else 'BEFORE'

            cursor.execute(f"""
                CREATE TRIGGER {trig_name}
                {timing} {op} ON {table}
                FOR EACH ROW
                BEGIN
                    INSERT INTO AuditLog (Timestamp, Username, Action, Endpoint, IPAddress, Details, IsAuthorized)
                    VALUES (
                        NOW(),
                        COALESCE(@app_username, 'DIRECT_DB_ACCESS'),
                        '{op}_{table.upper()}',
                        COALESCE(@app_endpoint, 'DIRECT_SQL'),
                        COALESCE(@app_ip, 'N/A'),
                        {detail_expr},
                        IF(@app_username IS NOT NULL, TRUE, FALSE)
                    );
                END
            """)

    conn.commit()
    print("Tables and audit triggers created.")

    # --- Insert mock data ---
    # Mark seed operations as authorized so triggers don't flag them
    cursor.execute("SET @app_username = 'SEED_SCRIPT'")
    cursor.execute("SET @app_endpoint = 'seed.py'")
    cursor.execute("SET @app_ip = 'localhost'")
    pw = generate_password_hash('password123')

    members = [
        (1, 'laksh_jain', 'Laksh Jain', 'laksh.jain@iitgn.ac.in', pw, 'Student', '9876543210', '2025-08-15', '#4F46E5', False),
        (2, 'parthiv_p', 'Parthiv Patel', 'parthiv.p@iitgn.ac.in', pw, 'Student', '9876543211', '2025-08-15', '#059669', False),
        (3, 'ridham_p', 'Ridham Patel', 'ridham.p@iitgn.ac.in', pw, 'Student', '9876543212', '2025-08-15', '#DC2626', False),
        (4, 'rudra_s', 'Rudra Singh', 'rudra.singh@iitgn.ac.in', pw, 'Student', '9876543213', '2025-08-15', '#D97706', False),
        (5, 'shriniket_b', 'Shriniket Behera', 'shriniket.b@iitgn.ac.in', pw, 'Student', '9876543214', '2025-08-15', '#7C3AED', False),
        (6, 'prof_yogesh', 'Dr. Yogesh K. Meena', 'yogesh.meena@iitgn.ac.in', pw, 'Professor', '9876543215', '2020-01-10', '#0891B2', False),
        (7, 'prof_anirban', 'Dr. Anirban Dasgupta', 'anirban.d@iitgn.ac.in', pw, 'Professor', '9876543216', '2019-06-01', '#BE185D', False),
        (8, 'alumni_rahul', 'Rahul Sharma', 'rahul.sharma@alumni.iitgn.ac.in', pw, 'Alumni', '9876543217', '2018-05-20', '#65A30D', False),
        (9, 'alumni_priya', 'Priya Verma', 'priya.verma@alumni.iitgn.ac.in', pw, 'Alumni', '9876543218', '2019-05-20', '#EA580C', False),
        (10, 'techclub', 'Technical Club IITGN', 'techclub@iitgn.ac.in', pw, 'Organization', '9876543219', '2020-09-01', '#4338CA', False),
        (11, 'admin_user', 'System Admin', 'admin@iitgn.ac.in', pw, 'Student', '9876543220', '2025-01-01', '#991B1B', True),
    ]
    cursor.executemany(
        "INSERT INTO Member (MemberID, Username, Name, Email, Password, MemberType, ContactNumber, CreatedAt, AvatarColor, IsAdmin) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        members,
    )

    students = [
        (1, 'B.Tech', 'Computer Science', 3, 'Mess A'),
        (2, 'B.Tech', 'Electrical Engineering', 3, 'Mess B'),
        (3, 'B.Tech', 'Mechanical Engineering', 2, 'Mess A'),
        (4, 'M.Tech', 'Artificial Intelligence', 1, 'Mess B'),
        (5, 'PhD', 'Computer Science', 2, 'Mess A'),
        (11, 'B.Tech', 'Computer Science', 4, 'Mess A'),
    ]
    cursor.executemany(
        "INSERT INTO Student (MemberID, Programme, Branch, CurrentYear, MessAssignment) VALUES (%s,%s,%s,%s,%s)",
        students,
    )

    professors = [
        (6, 'Associate Professor', 'Computer Science', '2020-01-10'),
        (7, 'Professor', 'Computer Science', '2019-06-01'),
    ]
    cursor.executemany(
        "INSERT INTO Professor (MemberID, Designation, Department, JoiningDate) VALUES (%s,%s,%s,%s)",
        professors,
    )

    alumni_data = [
        (8, 'Google', 2022, True),
        (9, 'Microsoft', 2023, True),
    ]
    cursor.executemany(
        "INSERT INTO Alumni (MemberID, CurrentOrganization, GraduationYear, Verified) VALUES (%s,%s,%s,%s)",
        alumni_data,
    )

    orgs = [
        (10, 'Technical Club', '2020-09-01', 'techclub@iitgn.ac.in'),
    ]
    cursor.executemany(
        "INSERT INTO Organization (MemberID, OrgType, FoundationDate, ContactEmail) VALUES (%s,%s,%s,%s)",
        orgs,
    )

    courses = [
        (1, 'CS432', 'Databases', 'A', 6),
        (2, 'CS301', 'Algorithms', 'B', 7),
        (3, 'CS201', 'Data Structures', 'C', 6),
        (4, 'MA201', 'Linear Algebra', 'D', 7),
    ]
    cursor.executemany(
        "INSERT INTO Course (CourseID, CourseCode, CourseName, CourseSlot, ProfessorID) VALUES (%s,%s,%s,%s,%s)",
        courses,
    )

    # All student IDs: 1 (Laksh), 2 (Parthiv), 3 (Ridham), 4 (Shriniket), 5 (Rudra), 11 (Admin/Student)
    all_student_ids = [1, 2, 3, 4, 5, 11]

    # Enroll every student in 2-3 courses
    enrollments = [
        # Student 1 (Laksh) — CS432, CS301
        (1, 1, '2026-01-10', 'Spring 2026', 'Active'),
        (1, 2, '2026-01-10', 'Spring 2026', 'Active'),
        # Student 2 (Parthiv) — CS432, Data Structures
        (2, 1, '2026-01-10', 'Spring 2026', 'Active'),
        (2, 3, '2026-01-10', 'Spring 2026', 'Active'),
        # Student 3 (Ridham) — CS301, Linear Algebra
        (3, 2, '2026-01-10', 'Spring 2026', 'Active'),
        (3, 4, '2026-01-10', 'Spring 2026', 'Active'),
        # Student 4 (Shriniket) — CS432, CS301, Data Structures
        (4, 1, '2026-01-10', 'Spring 2026', 'Active'),
        (4, 2, '2026-01-10', 'Spring 2026', 'Active'),
        (4, 3, '2026-01-10', 'Spring 2026', 'Active'),
        # Student 5 (Rudra) — CS432, Linear Algebra
        (5, 1, '2026-01-10', 'Spring 2026', 'Active'),
        (5, 4, '2026-01-10', 'Spring 2026', 'Active'),
        # Student 11 (Admin) — CS432, CS301
        (11, 1, '2026-01-10', 'Spring 2026', 'Active'),
        (11, 2, '2026-01-10', 'Spring 2026', 'Active'),
    ]
    cursor.executemany(
        "INSERT INTO Enrollment (StudentID, CourseID, EnrollmentDate, Semester, Status) VALUES (%s,%s,%s,%s,%s)",
        enrollments,
    )

    # Build enrollment map: student -> list of enrolled courseIDs
    enrollment_map = {}
    for sid, cid, *_ in enrollments:
        enrollment_map.setdefault(sid, []).append(cid)

    # Generate class attendance for ALL students (March 1-20, 2026)
    # Each student gets attendance only for courses they are enrolled in
    statuses = ['Present', 'Present', 'Present', 'Present', 'Absent']
    class_att = []
    att_id = 1
    for sid in all_student_ids:
        enrolled_courses = enrollment_map.get(sid, [])
        for day in range(1, 21):
            date = f"2026-03-{day:02d}"
            for cid in enrolled_courses:
                class_att.append((att_id, cid, sid, date, random.choice(statuses)))
                att_id += 1
    cursor.executemany(
        "INSERT INTO ClassAttendance (AttendanceID, CourseID, StudentID, RecordDate, Status) VALUES (%s,%s,%s,%s,%s)",
        class_att,
    )

    # Generate mess attendance for ALL students (March 1-20, 2026)
    meals = ['Breakfast', 'Lunch', 'Dinner']
    mess_statuses = ['Eaten', 'Eaten', 'Eaten', 'Missed']
    mess_att = []
    mess_id = 1
    for sid in all_student_ids:
        for day in range(1, 21):
            date = f"2026-03-{day:02d}"
            for meal in meals:
                mess_att.append((mess_id, sid, date, meal, random.choice(mess_statuses)))
                mess_id += 1
    cursor.executemany(
        "INSERT INTO MessAttendance (MessRecordID, StudentID, RecordDate, MealType, Status) VALUES (%s,%s,%s,%s,%s)",
        mess_att,
    )

    groups = [
        (1, 'CS Batch 2023', 'Computer Science batch of 2023 discussion group', 1),
        (2, 'Coding Club', 'Competitive programming and hackathons', 10),
        (3, 'Photography Club', 'Capture the beautiful campus life', 3),
        (4, 'DB Project Group', 'CS432 Database project collaboration - Group Chernaugh', 1),
        (5, 'Placement Prep 2026', 'Resources and tips for campus placements', 2),
    ]
    cursor.executemany(
        "INSERT INTO CampusGroup (GroupID, Name, Description, AdminID) VALUES (%s,%s,%s,%s)",
        groups,
    )

    memberships = [
        (1, 1, 'Admin', '2025-08-15'),
        (1, 2, 'Member', '2025-08-16'),
        (1, 3, 'Member', '2025-08-17'),
        (2, 1, 'Member', '2025-09-01'),
        (2, 10, 'Admin', '2025-09-01'),
        (2, 5, 'Moderator', '2025-09-02'),
        (4, 1, 'Admin', '2026-02-01'),
        (4, 2, 'Member', '2026-02-01'),
        (4, 3, 'Member', '2026-02-01'),
        (4, 4, 'Member', '2026-02-01'),
        (4, 5, 'Member', '2026-02-01'),
        (5, 2, 'Admin', '2026-01-15'),
        (5, 1, 'Member', '2026-01-16'),
    ]
    cursor.executemany(
        "INSERT INTO GroupMembership (GroupID, MemberID, Role, JoinedAt) VALUES (%s,%s,%s,%s)",
        memberships,
    )

    posts = [
        (1, 1, None, 'Just finished implementing the B+ Tree for our CS432 assignment! The node splitting logic was tricky but finally got it working. Happy to help anyone stuck on it.', None, '2026-03-15 14:30:00'),
        (2, 6, None, 'Reminder: CS432 Assignment 2 deadline is March 22nd, 6:00 PM. Make sure both Module A and Module B are complete. No extensions will be given.', None, '2026-03-14 10:00:00'),
        (3, 10, 2, 'Coding Club is organizing a hackathon next weekend! Theme: Campus Solutions. Teams of 3-4. Register by Friday. Prizes worth Rs. 50,000!', None, '2026-03-13 16:45:00'),
        (4, 3, None, 'The sunset from the library terrace today was absolutely stunning! IITGN campus never disappoints.', None, '2026-03-13 18:30:00'),
        (5, 8, None, "Excited to share that Google is hiring for SDE-2 positions! If you're from IITGN, I can refer you. Check the job postings section for details.", None, '2026-03-12 11:00:00'),
        (6, 2, 4, "Team, I've pushed the ER diagram to the repo. Please review and suggest changes before tomorrow's meeting.", None, '2026-03-11 20:15:00'),
        (7, 7, None, 'Office hours for Algorithms (CS301) have been moved to Wednesday 3-5 PM this week due to faculty meeting on Monday.', None, '2026-03-10 09:00:00'),
        (8, 5, 1, 'Anyone up for a study session at the library tonight? Working on the databases assignment and could use some company.', None, '2026-03-10 17:00:00'),
        # More group messages
        (9, 1, 4, 'I have added indexing on all the major query columns. Benchmark shows ~25% average speedup. Check benchmark.py output.', None, '2026-03-16 10:00:00'),
        (10, 3, 4, 'Great work! I have completed the audit logging module. Every API call is now tracked in audit.log.', None, '2026-03-16 11:30:00'),
        (11, 2, 4, 'Guys, I have finished the frontend integration for groups and polls. Everything is connected to the API now.', None, '2026-03-16 14:00:00'),
        (12, 5, 4, 'The seed data is looking good. I added attendance records for all students across both semesters.', None, '2026-03-17 09:15:00'),
        (13, 1, 1, 'Mid-semester marks are out! Check the portal. CS432 average was 28/40.', None, '2026-03-16 16:00:00'),
        (14, 2, 1, 'Does anyone have notes for the concurrency control lecture? I missed that class.', None, '2026-03-17 11:00:00'),
        (15, 10, 2, 'Weekly contest results are in! Congratulations to Shriniket for solving all 4 problems. Leaderboard updated on the club website.', None, '2026-03-15 20:00:00'),
        (16, 5, 2, 'Thanks everyone! The contest problems were really interesting, especially the graph one.', None, '2026-03-15 20:30:00'),
        (17, 3, 3, 'Captured some amazing shots of the new academic block at golden hour. Will share the album link soon!', None, '2026-03-14 18:00:00'),
        (18, 2, 5, 'Compiled a list of must-do DSA problems for placement prep. Sharing the Google Doc link in the files section.', None, '2026-03-13 15:00:00'),
        (19, 1, 5, 'Mock interview sessions starting next week. Sign up sheet is pinned. Slots filling up fast!', None, '2026-03-14 10:30:00'),
    ]
    cursor.executemany(
        "INSERT INTO Post (PostID, AuthorID, GroupID, Content, ImageURL, CreatedAt) VALUES (%s,%s,%s,%s,%s,%s)",
        posts,
    )

    comments_data = [
        (1, 1, 2, 'Great job! Can you share some tips on handling the merge operation?', '2026-03-15 15:00:00'),
        (2, 1, 4, 'Same here, the deletion part is really confusing me.', '2026-03-15 15:30:00'),
        (3, 1, 1, "Sure! I'll write a summary and share it in the DB Project group.", '2026-03-15 16:00:00'),
        (4, 2, 1, 'Thank you for the reminder, Professor!', '2026-03-14 10:30:00'),
        (5, 2, 3, 'Will the submission be through GitHub only?', '2026-03-14 11:00:00'),
        (6, 3, 1, 'Count me in! Looking for teammates.', '2026-03-13 17:00:00'),
        (7, 5, 1, 'Thanks Rahul bhaiya! Just submitted my referral request.', '2026-03-12 12:00:00'),
        # Comments on group posts
        (8, 9, 2, 'Nice! Which queries showed the biggest improvement?', '2026-03-16 10:30:00'),
        (9, 9, 3, 'Global feed and attendance queries had ~80% speedup.', '2026-03-16 10:45:00'),
        (10, 6, 1, 'Looks good, I have a few suggestions on the cardinality constraints. Will comment on the repo.', '2026-03-11 21:00:00'),
        (11, 6, 3, 'Also, should we add a separate table for notifications?', '2026-03-11 21:30:00'),
        (12, 13, 3, 'Not bad! But the normalization questions were tricky.', '2026-03-16 16:30:00'),
        (13, 15, 1, 'Congrats Shriniket! Those graph problems were really tough.', '2026-03-15 20:15:00'),
        (14, 14, 3, 'I have notes, will share on WhatsApp.', '2026-03-17 11:30:00'),
        (15, 18, 1, 'This is super helpful! Thanks Parthiv.', '2026-03-13 15:30:00'),
    ]
    cursor.executemany(
        "INSERT INTO Comment (CommentID, PostID, AuthorID, Content, CreatedAt) VALUES (%s,%s,%s,%s,%s)",
        comments_data,
    )

    post_likes = [
        (1, 2), (1, 3), (1, 6),
        (2, 1), (2, 2), (2, 3),
        (3, 1), (3, 2),
        (5, 1), (5, 2), (5, 3),
        # Likes on group posts
        (9, 2), (9, 3), (9, 5),
        (10, 1), (10, 2),
        (11, 1), (11, 3), (11, 5),
        (13, 2), (13, 3),
        (15, 1), (15, 3), (15, 5),
        (17, 1), (17, 2), (17, 4),
        (18, 1), (18, 3), (18, 5),
        (19, 2), (19, 3),
    ]
    cursor.executemany(
        "INSERT INTO PostLike (PostID, MemberID) VALUES (%s,%s)",
        post_likes,
    )

    polls = [
        (1, 6, 'Which day works best for the CS432 extra lecture?', '2026-03-14 08:00:00', '2026-03-18 23:59:00'),
        (2, 10, 'What theme should the next hackathon have?', '2026-03-13 12:00:00', '2026-03-20 23:59:00'),
        (3, 1, 'Best mess food this week?', '2026-03-12 19:00:00', '2026-03-16 23:59:00'),
    ]
    cursor.executemany(
        "INSERT INTO Poll (PollID, CreatorID, Question, CreatedAt, ExpiresAt) VALUES (%s,%s,%s,%s,%s)",
        polls,
    )

    poll_options = [
        (1, 1, 'Saturday Morning'),
        (2, 1, 'Saturday Evening'),
        (3, 1, 'Sunday Morning'),
        (4, 1, 'Sunday Evening'),
        (5, 2, 'EdTech'),
        (6, 2, 'HealthTech'),
        (7, 2, 'FinTech'),
        (8, 2, 'Campus Solutions'),
        (9, 3, 'Monday Paneer'),
        (10, 3, 'Wednesday Biryani'),
        (11, 3, 'Friday Chole Bhature'),
    ]
    cursor.executemany(
        "INSERT INTO PollOption (OptionID, PollID, OptionText) VALUES (%s,%s,%s)",
        poll_options,
    )

    # Generate poll votes to match mock vote counts
    # Poll 1: opt1=25, opt2=42, opt3=18, opt4=31
    # Poll 2: opt5=34, opt6=28, opt7=45, opt8=52
    # Poll 3: opt9=67, opt10=89, opt11=54
    # We'll insert votes using fake member IDs via a trick: use a range of voter IDs
    # Since we only have 11 members, we'll just insert a representative sample
    poll_votes = []
    vote_counts = {1: 3, 2: 5, 3: 2, 4: 4, 5: 4, 6: 3, 7: 5, 8: 6, 9: 7, 10: 9, 11: 5}
    for opt_id, count in vote_counts.items():
        for voter_id in range(1, min(count + 1, 12)):
            poll_votes.append((opt_id, voter_id))
    # Deduplicate (a member can only vote once per poll, but here we allow voting on different options)
    seen = set()
    unique_votes = []
    for oid, mid in poll_votes:
        if (oid, mid) not in seen:
            seen.add((oid, mid))
            unique_votes.append((oid, mid))
    cursor.executemany(
        "INSERT IGNORE INTO PollVote (OptionID, MemberID) VALUES (%s,%s)",
        unique_votes,
    )

    jobs = [
        (1, 8, 'Software Engineer - L4', 'Google', 'Looking for strong problem solvers with experience in distributed systems. New grad and 1 YOE welcome.', 'https://careers.google.com', '2026-03-12 10:00:00'),
        (2, 9, 'SDE Intern - Summer 2026', 'Microsoft', 'Summer internship opportunity in Azure Cloud team. Must be familiar with cloud computing concepts.', 'https://careers.microsoft.com', '2026-03-10 14:00:00'),
        (3, 8, 'ML Engineer', 'Google DeepMind', 'Research-oriented ML role. PhD or strong research background preferred. Work on cutting-edge AI problems.', 'https://deepmind.google', '2026-03-08 09:00:00'),
        (4, 9, 'Product Manager', 'Microsoft', 'PM role for Office 365 team. Technical background with good communication skills required.', 'https://careers.microsoft.com', '2026-03-05 16:00:00'),
    ]
    cursor.executemany(
        "INSERT INTO JobPost (JobID, AlumniID, Title, Company, Description, ApplicationLink, PostedAt) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        jobs,
    )

    referrals = [
        (1, 1, 8, 'Google', 'Software Engineer', 'https://careers.google.com/jobs/1', 'Approved', '2026-03-12 12:00:00'),
        (2, 2, 8, 'Google', 'ML Engineer', 'https://careers.google.com/jobs/2', 'Pending', '2026-03-13 10:00:00'),
        (3, 3, 9, 'Microsoft', 'SDE Intern', 'https://careers.microsoft.com/jobs/1', 'Pending', '2026-03-14 15:00:00'),
        (4, 1, 9, 'Microsoft', 'Product Manager', 'https://careers.microsoft.com/jobs/2', 'Rejected', '2026-03-11 08:00:00'),
    ]
    cursor.executemany(
        "INSERT INTO ReferralRequest (RequestID, StudentID, TargetAlumniID, TargetCompany, TargetRole, JobPostingURL, Status, RequestedAt) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        referrals,
    )

    claims = [
        (1, 1, 'Is Laksh the best coder in the batch?', 'Of course!'),
        (2, 1, 'Does Laksh help others with assignments?', 'Always happy to help!'),
        (3, 2, 'Is Parthiv the most punctual student?', 'I try my best!'),
        (4, 3, 'Is Ridham the best photographer on campus?', 'Photography is my passion!'),
    ]
    cursor.executemany(
        "INSERT INTO ProfileClaimQuestion (ClaimID, MemberID, QuestionText, UserResponse) VALUES (%s,%s,%s,%s)",
        claims,
    )

    claim_votes = [
        (1, 2, True), (1, 3, True), (1, 4, False), (1, 5, True),
        (2, 2, True), (2, 3, True),
        (3, 1, True), (3, 4, False),
        (4, 1, True), (4, 2, True),
    ]
    cursor.executemany(
        "INSERT INTO ProfileClaimVote (ClaimID, VoterID, IsAgree) VALUES (%s,%s,%s)",
        claim_votes,
    )

    conn.commit()
    cursor.close()
    conn.close()
    print("Seed data inserted successfully!")


if __name__ == '__main__':
    run()
