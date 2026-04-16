"""
benchmark.py  --  SQL Index Performance Benchmarking for IITGN Connect
CS432 Databases Module B

Measures query execution times BEFORE and AFTER applying indexes defined in
sql/indexes.sql, runs EXPLAIN analysis, and generates comparison charts.

Usage:  python benchmark.py
Outputs:
  - Console table with timing results
  - benchmark_results.json
  - benchmarks/  directory with PNG bar charts
"""

import json
import os
import time
import textwrap

import mysql.connector
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

# ---------------------------------------------------------------------------
# Database config
# ---------------------------------------------------------------------------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "root",
    "database": "iitgn_connect",
}

NUM_RUNS = 100  # iterations per query for timing

# ---------------------------------------------------------------------------
# Benchmark queries  --  representative queries taken from the API routes
# ---------------------------------------------------------------------------
QUERIES = [
    {
        "name": "Global Post Feed",
        "description": "Fetch all posts with author info, like/comment counts, ordered by date",
        "sql_before": textwrap.dedent("""\
            SELECT p.*, m.Username, m.Name, m.MemberType, m.AvatarColor,
                   g.Name AS GroupName,
                   (SELECT COUNT(*) FROM PostLike IGNORE INDEX (PRIMARY, fk_PostLike_PostID) WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment IGNORE INDEX (fk_Comment_PostID, idx_comment_postid, idx_comment_postid_createdat) WHERE PostID = p.PostID) AS commentCount
            FROM Post p IGNORE INDEX (idx_post_createdat, idx_post_authorid, idx_post_authorid_createdat, idx_post_groupid, idx_post_groupid_createdat, fk_Post_AuthorID, fk_Post_GroupID)
            JOIN Member m IGNORE INDEX (idx_member_name, idx_member_membertype) ON p.AuthorID = m.MemberID
            LEFT JOIN CampusGroup g ON p.GroupID = g.GroupID
            ORDER BY p.CreatedAt DESC
        """),
        "sql_after": textwrap.dedent("""\
            SELECT p.*, m.Username, m.Name, m.MemberType, m.AvatarColor,
                   g.Name AS GroupName,
                   (SELECT COUNT(*) FROM PostLike WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID) AS commentCount
            FROM Post p
            JOIN Member m ON p.AuthorID = m.MemberID
            LEFT JOIN CampusGroup g ON p.GroupID = g.GroupID
            ORDER BY p.CreatedAt DESC
        """),
    },
    {
        "name": "Group Posts",
        "description": "Posts for a specific group with counts, ordered by date",
        "sql_before": textwrap.dedent("""\
            SELECT p.*, m.Username, m.Name, m.MemberType, m.AvatarColor,
                   (SELECT COUNT(*) FROM PostLike IGNORE INDEX (PRIMARY, fk_PostLike_PostID) WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment IGNORE INDEX (fk_Comment_PostID, idx_comment_postid, idx_comment_postid_createdat) WHERE PostID = p.PostID) AS commentCount
            FROM Post p IGNORE INDEX (idx_post_groupid, idx_post_groupid_createdat, fk_Post_GroupID)
            JOIN Member m ON p.AuthorID = m.MemberID
            WHERE p.GroupID = 4
            ORDER BY p.CreatedAt DESC
        """),
        "sql_after": textwrap.dedent("""\
            SELECT p.*, m.Username, m.Name, m.MemberType, m.AvatarColor,
                   (SELECT COUNT(*) FROM PostLike WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID) AS commentCount
            FROM Post p
            JOIN Member m ON p.AuthorID = m.MemberID
            WHERE p.GroupID = 4
            ORDER BY p.CreatedAt DESC
        """),
    },
    {
        "name": "Post Comments",
        "description": "All comments for a post with author details, ordered chronologically",
        "sql_before": textwrap.dedent("""\
            SELECT c.*, m.Username, m.Name, m.MemberType, m.AvatarColor
            FROM Comment c IGNORE INDEX (fk_Comment_PostID, idx_comment_postid, idx_comment_postid_createdat, idx_comment_authorid, fk_Comment_AuthorID)
            JOIN Member m ON c.AuthorID = m.MemberID
            WHERE c.PostID = 1
            ORDER BY c.CreatedAt ASC
        """),
        "sql_after": textwrap.dedent("""\
            SELECT c.*, m.Username, m.Name, m.MemberType, m.AvatarColor
            FROM Comment c
            JOIN Member m ON c.AuthorID = m.MemberID
            WHERE c.PostID = 1
            ORDER BY c.CreatedAt ASC
        """),
    },
    {
        "name": "User Profile Posts",
        "description": "Recent posts by a member for profile page",
        "sql_before": textwrap.dedent("""\
            SELECT p.*,
                   (SELECT COUNT(*) FROM PostLike IGNORE INDEX (PRIMARY, fk_PostLike_PostID) WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment IGNORE INDEX (fk_Comment_PostID, idx_comment_postid) WHERE PostID = p.PostID) AS commentCount,
                   g.Name AS GroupName
            FROM Post p IGNORE INDEX (fk_Post_AuthorID, idx_post_authorid, idx_post_authorid_createdat)
            LEFT JOIN CampusGroup g ON p.GroupID = g.GroupID
            WHERE p.AuthorID = 1
            ORDER BY p.CreatedAt DESC
            LIMIT 10
        """),
        "sql_after": textwrap.dedent("""\
            SELECT p.*,
                   (SELECT COUNT(*) FROM PostLike WHERE PostID = p.PostID) AS likes,
                   (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID) AS commentCount,
                   g.Name AS GroupName
            FROM Post p
            LEFT JOIN CampusGroup g ON p.GroupID = g.GroupID
            WHERE p.AuthorID = 1
            ORDER BY p.CreatedAt DESC
            LIMIT 10
        """),
    },
    {
        "name": "Class Attendance",
        "description": "Monthly class attendance with course info for a student",
        "sql_before": textwrap.dedent("""\
            SELECT ca.AttendanceID, ca.CourseID, ca.RecordDate, ca.Status,
                   c.CourseCode, c.CourseName
            FROM ClassAttendance ca IGNORE INDEX (fk_ClassAttendance_StudentID, idx_classattendance_studentid_date, idx_classattendance_courseid, fk_ClassAttendance_CourseID)
            JOIN Course c ON ca.CourseID = c.CourseID
            WHERE ca.StudentID = 1
              AND MONTH(ca.RecordDate) = 3
              AND YEAR(ca.RecordDate) = 2026
            ORDER BY ca.RecordDate
        """),
        "sql_after": textwrap.dedent("""\
            SELECT ca.AttendanceID, ca.CourseID, ca.RecordDate, ca.Status,
                   c.CourseCode, c.CourseName
            FROM ClassAttendance ca
            JOIN Course c ON ca.CourseID = c.CourseID
            WHERE ca.StudentID = 1
              AND MONTH(ca.RecordDate) = 3
              AND YEAR(ca.RecordDate) = 2026
            ORDER BY ca.RecordDate
        """),
    },
    {
        "name": "Mess Attendance",
        "description": "Monthly mess attendance records for a student",
        "sql_before": textwrap.dedent("""\
            SELECT * FROM MessAttendance IGNORE INDEX (fk_MessAttendance_StudentID, idx_messattendance_studentid_date)
            WHERE StudentID = 1
              AND MONTH(RecordDate) = 3
              AND YEAR(RecordDate) = 2026
            ORDER BY RecordDate, FIELD(MealType, 'Breakfast', 'Lunch', 'Dinner')
        """),
        "sql_after": textwrap.dedent("""\
            SELECT * FROM MessAttendance
            WHERE StudentID = 1
              AND MONTH(RecordDate) = 3
              AND YEAR(RecordDate) = 2026
            ORDER BY RecordDate, FIELD(MealType, 'Breakfast', 'Lunch', 'Dinner')
        """),
    },
    {
        "name": "Job Listings",
        "description": "All job posts with alumni info, ordered by posting date",
        "sql_before": textwrap.dedent("""\
            SELECT j.*, m.Name AS AlumniName, m.AvatarColor,
                   a.CurrentOrganization
            FROM JobPost j IGNORE INDEX (idx_jobpost_postedat, idx_jobpost_alumniid, fk_JobPost_AlumniID)
            JOIN Member m ON j.AlumniID = m.MemberID
            JOIN Alumni a ON j.AlumniID = a.MemberID
            ORDER BY j.PostedAt DESC
        """),
        "sql_after": textwrap.dedent("""\
            SELECT j.*, m.Name AS AlumniName, m.AvatarColor,
                   a.CurrentOrganization
            FROM JobPost j
            JOIN Member m ON j.AlumniID = m.MemberID
            JOIN Alumni a ON j.AlumniID = a.MemberID
            ORDER BY j.PostedAt DESC
        """),
    },
    {
        "name": "Referral Requests (Alumni)",
        "description": "Referral requests received by an alumni, newest first",
        "sql_before": textwrap.dedent("""\
            SELECT r.*, m.Name AS StudentName
            FROM ReferralRequest r IGNORE INDEX (fk_ReferralRequest_TargetAlumniID, idx_referral_targetalumniid_requestedat, idx_referral_studentid_requestedat, fk_ReferralRequest_StudentID)
            JOIN Member m ON r.StudentID = m.MemberID
            WHERE r.TargetAlumniID = 8
            ORDER BY r.RequestedAt DESC
        """),
        "sql_after": textwrap.dedent("""\
            SELECT r.*, m.Name AS StudentName
            FROM ReferralRequest r
            JOIN Member m ON r.StudentID = m.MemberID
            WHERE r.TargetAlumniID = 8
            ORDER BY r.RequestedAt DESC
        """),
    },
    {
        "name": "Polls with Options & Votes",
        "description": "All polls with vote counts per option",
        "sql_before": textwrap.dedent("""\
            SELECT p.*, m.Name AS CreatorName, m.AvatarColor
            FROM Poll p IGNORE INDEX (idx_poll_createdat, idx_poll_creatorid, fk_Poll_CreatorID)
            JOIN Member m ON p.CreatorID = m.MemberID
            ORDER BY p.CreatedAt DESC
        """),
        "sql_after": textwrap.dedent("""\
            SELECT p.*, m.Name AS CreatorName, m.AvatarColor
            FROM Poll p
            JOIN Member m ON p.CreatorID = m.MemberID
            ORDER BY p.CreatedAt DESC
        """),
    },
    {
        "name": "Member Search by Type",
        "description": "Filter members by type and order by name",
        "sql_before": textwrap.dedent("""\
            SELECT MemberID, Username, Name, Email, MemberType, ContactNumber,
                   CreatedAt, AvatarColor
            FROM Member IGNORE INDEX (idx_member_name, idx_member_membertype)
            WHERE MemberType = 'Student'
            ORDER BY Name
        """),
        "sql_after": textwrap.dedent("""\
            SELECT MemberID, Username, Name, Email, MemberType, ContactNumber,
                   CreatedAt, AvatarColor
            FROM Member
            WHERE MemberType = 'Student'
            ORDER BY Name
        """),
    },
]


# ---------------------------------------------------------------------------
# Index definitions  --  parsed from sql/indexes.sql
# ---------------------------------------------------------------------------
INDEX_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "sql", "indexes.sql")


def _parse_index_statements(filepath):
    """Return a list of CREATE INDEX statements from the SQL file."""
    with open(filepath, "r") as f:
        lines = f.readlines()
    # Strip comment lines and join
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("--") or not stripped:
            continue
        clean_lines.append(stripped)
    content = " ".join(clean_lines)
    stmts = []
    for part in content.split(";"):
        part = part.strip()
        if part.upper().startswith("CREATE INDEX") or part.upper().startswith("CREATE UNIQUE INDEX"):
            stmts.append(part + ";")
    return stmts


def _extract_index_names(statements):
    """Return list of (index_name, table_name) from CREATE INDEX statements."""
    pairs = []
    for stmt in statements:
        parts = stmt.split()
        idx = parts[2]  # index name
        table = parts[4]  # table name
        pairs.append((idx, table))
    return pairs


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ---------------------------------------------------------------------------
# Bulk data generation — MySQL needs 100+ rows per table before it prefers
# index lookups over full table scans.
# ---------------------------------------------------------------------------

def generate_bulk_data(cursor):
    """Insert temporary bulk data so MySQL optimizer prefers indexes."""
    import random
    from datetime import datetime, timedelta

    # Check if we already have enough data
    cursor.execute("SELECT COUNT(*) FROM Post")
    post_count = cursor.fetchone()[0]
    if post_count >= 500:
        return False  # already have bulk data

    print("Generating bulk data for realistic benchmarking...")

    base_id = 100
    dummy_hash = "$2b$12$dummyhashforbenchtesting000000000000000000000000000000"

    # 1. Bulk members — mixed types for MemberType index to show selectivity
    member_types = ['Student'] * 150 + ['Professor'] * 30 + ['Alumni'] * 40 + ['Organization'] * 10
    random.shuffle(member_types)

    alumni_ids = []
    student_ids = []
    all_member_ids = []

    for i, mtype in enumerate(member_types):
        mid = base_id + i
        all_member_ids.append(mid)
        try:
            cursor.execute(
                "INSERT INTO Member (MemberID, Username, Name, Email, Password, MemberType, ContactNumber, CreatedAt) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s, CURDATE())",
                (mid, f"bench_user_{i}", f"Bench User {i}", f"bench{i}@iitgn.ac.in",
                 dummy_hash, mtype, f"90000{i:05d}"),
            )
            if mtype == 'Student':
                student_ids.append(mid)
                cursor.execute(
                    "INSERT INTO Student (MemberID, Programme, Branch, CurrentYear, MessAssignment) "
                    "VALUES (%s, 'B.Tech', %s, %s, %s)",
                    (mid, random.choice(["Computer Science", "Electrical", "Mechanical", "Chemical"]),
                     random.randint(1, 4), random.choice(["Mess A", "Mess B"])),
                )
            elif mtype == 'Professor':
                cursor.execute(
                    "INSERT INTO Professor (MemberID, Designation, Department, JoiningDate) "
                    "VALUES (%s, %s, %s, CURDATE())",
                    (mid, random.choice(["Assistant Professor", "Associate Professor"]),
                     random.choice(["CSE", "EE", "ME", "CE"])),
                )
            elif mtype == 'Alumni':
                alumni_ids.append(mid)
                cursor.execute(
                    "INSERT INTO Alumni (MemberID, CurrentOrganization, GraduationYear, Verified) "
                    "VALUES (%s, %s, %s, %s)",
                    (mid, f"Company_{random.randint(1,50)}", random.randint(2018, 2025),
                     random.choice([True, False])),
                )
            elif mtype == 'Organization':
                cursor.execute(
                    "INSERT INTO Organization (MemberID, OrgType, FoundationDate, ContactEmail) "
                    "VALUES (%s, %s, CURDATE(), %s)",
                    (mid, random.choice(["Club", "Committee", "Cell"]), f"org{i}@iitgn.ac.in"),
                )
        except Exception:
            pass

    if not alumni_ids:
        alumni_ids = [8]
    if not student_ids:
        student_ids = [1, 2, 3]

    # 2. Bulk posts (2000 across many authors and groups)
    for i in range(2000):
        author = random.choice(all_member_ids[:80] + [1, 2, 3, 5])
        group = random.choice([None, None, 1, 2, 3, 4])  # more NULLs
        days_ago = random.randint(0, 365)
        dt = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
        try:
            cursor.execute(
                "INSERT INTO Post (AuthorID, GroupID, Content, CreatedAt) VALUES (%s,%s,%s,%s)",
                (author, group, f"Benchmark post {i} content for testing.", dt),
            )
        except Exception:
            pass

    # 3. Bulk comments (5000)
    cursor.execute("SELECT PostID FROM Post")
    post_ids = [r[0] for r in cursor.fetchall()]
    for i in range(5000):
        pid = random.choice(post_ids)
        author = random.choice(all_member_ids[:50] + [1, 2, 3])
        dt = datetime.now() - timedelta(days=random.randint(0, 180))
        try:
            cursor.execute(
                "INSERT INTO Comment (PostID, AuthorID, Content, CreatedAt) VALUES (%s,%s,%s,%s)",
                (pid, author, f"Benchmark comment {i}", dt),
            )
        except Exception:
            pass

    # 4. Bulk likes (8000)
    for i in range(8000):
        pid = random.choice(post_ids)
        mid = random.choice(all_member_ids + [1, 2, 3, 5])
        try:
            cursor.execute("INSERT IGNORE INTO PostLike (PostID, MemberID) VALUES (%s,%s)", (pid, mid))
        except Exception:
            pass

    # 5. Bulk attendance (10000 class, 8000 mess)
    cursor.execute("SELECT CourseID FROM Course")
    course_ids = [r[0] for r in cursor.fetchall()]
    for i in range(10000):
        sid = random.choice(student_ids[:30] + [1, 2, 3])
        cid = random.choice(course_ids) if course_ids else 1
        dt = datetime.now() - timedelta(days=random.randint(0, 180))
        try:
            cursor.execute(
                "INSERT INTO ClassAttendance (CourseID, StudentID, RecordDate, Status) VALUES (%s,%s,%s,%s)",
                (cid, sid, dt.date(), random.choice(["Present", "Absent"])),
            )
        except Exception:
            pass

    for i in range(8000):
        sid = random.choice(student_ids[:30] + [1, 2, 3])
        dt = datetime.now() - timedelta(days=random.randint(0, 180))
        try:
            cursor.execute(
                "INSERT INTO MessAttendance (StudentID, RecordDate, MealType, Status) VALUES (%s,%s,%s,%s)",
                (sid, dt.date(), random.choice(["Breakfast", "Lunch", "Dinner"]),
                 random.choice(["Eaten", "Missed"])),
            )
        except Exception:
            pass

    # 6. Bulk polls + options + votes
    for i in range(100):
        creator = random.choice(all_member_ids[:30])
        dt = datetime.now() - timedelta(days=random.randint(0, 120))
        exp = dt + timedelta(days=7)
        try:
            cursor.execute(
                "INSERT INTO Poll (CreatorID, Question, CreatedAt, ExpiresAt) VALUES (%s,%s,%s,%s)",
                (creator, f"Benchmark poll question {i}?", dt, exp),
            )
            poll_id = cursor.lastrowid
            opt_ids = []
            for j in range(random.randint(2, 5)):
                cursor.execute(
                    "INSERT INTO PollOption (PollID, OptionText) VALUES (%s,%s)",
                    (poll_id, f"Option {j+1}"),
                )
                opt_ids.append(cursor.lastrowid)
            for k in range(random.randint(10, 60)):
                voter = random.choice(all_member_ids)
                oid = random.choice(opt_ids)
                cursor.execute("INSERT IGNORE INTO PollVote (OptionID, MemberID) VALUES (%s,%s)", (oid, voter))
        except Exception:
            pass

    # 7. Bulk jobs — spread across MANY alumni (not just one)
    for i in range(100):
        alum = random.choice(alumni_ids + [8])
        try:
            cursor.execute(
                "INSERT INTO JobPost (AlumniID, Title, Company, Description, PostedAt) VALUES (%s,%s,%s,%s,%s)",
                (alum, f"Benchmark Job {i}", f"Company {random.randint(1,50)}",
                 "Job description for benchmarking",
                 datetime.now() - timedelta(days=random.randint(0, 180))),
            )
        except Exception:
            pass

    # 8. Bulk referrals — spread across many alumni for good selectivity
    for i in range(200):
        sid = random.choice(student_ids[:20] + [1, 2, 3])
        alum = random.choice(alumni_ids + [8])
        try:
            cursor.execute(
                "INSERT INTO ReferralRequest (StudentID, TargetAlumniID, TargetCompany, TargetRole, Status, RequestedAt) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (sid, alum, f"Company {random.randint(1,50)}", f"Role {i}",
                 random.choice(["Pending", "Approved", "Rejected"]),
                 datetime.now() - timedelta(days=random.randint(0, 120))),
            )
        except Exception:
            pass

    # Force MySQL to update table statistics
    for table in ['Member', 'Post', 'Comment', 'PostLike', 'Poll', 'PollOption', 'PollVote',
                  'JobPost', 'ReferralRequest', 'ClassAttendance', 'MessAttendance']:
        try:
            cursor.execute(f"ANALYZE TABLE {table}")
            cursor.fetchall()
        except Exception:
            pass

    print("  Bulk data inserted successfully.\n")
    return True


def cleanup_bulk_data(cursor):
    """Remove temporary benchmark data."""
    cursor.execute("DELETE FROM Member WHERE MemberID >= 100 AND Username LIKE 'bench_user_%'")
    cursor.execute("DELETE FROM Post WHERE Content LIKE 'Benchmark post %'")
    cursor.execute("DELETE FROM Poll WHERE Question LIKE 'Benchmark poll %'")
    cursor.execute("DELETE FROM JobPost WHERE Title LIKE 'Benchmark Job %'")
    cursor.execute("DELETE FROM ReferralRequest WHERE TargetCompany LIKE 'Company %'")


import re


def run_explain(cursor, sql):
    """Run EXPLAIN on a query and return the result rows as list of dicts."""
    cursor.execute("EXPLAIN " + sql)
    columns = [d[0] for d in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]


def run_explain_analyze(cursor, sql):
    """Run EXPLAIN ANALYZE and return the raw tree text + parsed metrics.

    MySQL 8.0.18+ EXPLAIN ANALYZE returns a tree like:
      -> Limit: 10 row(s)  (cost=505 rows=10) (actual time=4.24..5.4 rows=10 loops=1)
          -> Index scan on p using idx_post_createdat  (cost=0.04 rows=10) (actual time=3.81..4.89 rows=10 loops=1)
    """
    cursor.execute("EXPLAIN ANALYZE " + sql)
    raw_rows = cursor.fetchall()
    # The output comes as a single column with embedded \n
    tree_text = "\n".join(str(r[0]) for r in raw_rows)

    # Parse each node line
    nodes = _parse_explain_analyze_tree(tree_text)

    # Extract top-level actual time as total execution time
    total_time_ms = 0.0
    if nodes:
        total_time_ms = nodes[0].get("actual_time_end", 0.0)

    return {
        "tree_text": tree_text,
        "nodes": nodes,
        "total_time_ms": total_time_ms,
    }


def _parse_explain_analyze_tree(tree_text):
    """Parse EXPLAIN ANALYZE tree output into structured node list."""
    nodes = []
    # Match lines like:
    #   -> Table scan on Member  (cost=25.4 rows=241) (actual time=0.066..0.068 rows=5 loops=1)
    #   -> Index scan on p using idx_post_createdat  (cost=0.04 rows=10) (actual time=3.8..4.9 rows=10 loops=1)
    #   -> Sort: p.CreatedAt DESC  (cost=207 rows=2017) (actual time=6.85..6.85 rows=10 loops=1)
    pattern = re.compile(
        r'(?P<indent>\s*)->\s*(?P<operation>.+?)'
        r'\s*\(cost=(?P<cost>[\d.]+)\s+rows=(?P<est_rows>[\d.]+)\)'
        r'\s*\(actual time=(?P<time_start>[\d.]+)\.\.(?P<time_end>[\d.]+)'
        r'\s+rows=(?P<actual_rows>[\d.]+)\s+loops=(?P<loops>\d+)\)'
    )

    for line in tree_text.split('\n'):
        line = line.rstrip()
        if not line:
            continue
        m = pattern.search(line)
        if m:
            operation = m.group('operation').strip()
            # Determine scan type from operation text
            scan_type = _classify_scan_type(operation)

            nodes.append({
                "depth": len(m.group('indent')) // 4,
                "operation": operation,
                "scan_type": scan_type,
                "cost": float(m.group('cost')),
                "est_rows": float(m.group('est_rows')),
                "actual_time_start": float(m.group('time_start')),
                "actual_time_end": float(m.group('time_end')),
                "actual_rows": float(m.group('actual_rows')),
                "loops": int(m.group('loops')),
            })
    return nodes


def _classify_scan_type(operation):
    """Classify the EXPLAIN ANALYZE operation into a scan type category."""
    op_lower = operation.lower()
    if 'table scan' in op_lower:
        return 'Full Table Scan'
    elif 'index scan' in op_lower:
        return 'Full Index Scan'
    elif 'covering index scan' in op_lower:
        return 'Covering Index Scan'
    elif 'covering index lookup' in op_lower:
        return 'Covering Index Lookup'
    elif 'index range scan' in op_lower:
        return 'Index Range Scan'
    elif 'index lookup' in op_lower:
        return 'Index Lookup'
    elif 'single-row index lookup' in op_lower or 'single-row covering index lookup' in op_lower:
        return 'Unique Lookup'
    elif 'sort' in op_lower:
        return 'Sort'
    elif 'filter' in op_lower:
        return 'Filter'
    elif 'aggregate' in op_lower:
        return 'Aggregate'
    elif 'nested loop' in op_lower:
        return 'Nested Loop Join'
    elif 'limit' in op_lower:
        return 'Limit'
    else:
        return 'Other'


def measure_time(cursor, sql, n=NUM_RUNS):
    """Execute a query n times and return average time in milliseconds."""
    # Warm-up run
    cursor.execute(sql)
    cursor.fetchall()

    times = []
    for _ in range(n):
        start = time.perf_counter()
        cursor.execute(sql)
        cursor.fetchall()
        end = time.perf_counter()
        times.append((end - start) * 1000)  # ms
    return sum(times) / len(times)


def drop_custom_indexes(cursor, index_pairs):
    """Safely drop all custom indexes (ignoring errors for missing ones)."""
    for idx_name, table_name in index_pairs:
        try:
            cursor.execute(f"DROP INDEX `{idx_name}` ON `{table_name}`")
        except mysql.connector.Error:
            pass  # index does not exist yet


def apply_indexes(cursor, statements):
    """Apply all CREATE INDEX statements, skipping duplicates."""
    for stmt in statements:
        try:
            cursor.execute(stmt)
        except mysql.connector.Error as e:
            if e.errno == 1061:  # Duplicate key name
                pass
            else:
                print(f"  Warning: {e.msg}")


def get_all_non_pk_indexes(cursor):
    """Get all non-PRIMARY indexes across all tables (including FK auto-indexes)."""
    cursor.execute("""
        SELECT DISTINCT TABLE_NAME, INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND INDEX_NAME != 'PRIMARY'
        ORDER BY TABLE_NAME, INDEX_NAME
    """)
    return cursor.fetchall()


def drop_all_indexes(cursor):
    """Drop ALL non-PK indexes (including FK auto-indexes) by temporarily
    disabling FK checks. Returns list of (table, index) for restoration."""
    indexes = get_all_non_pk_indexes(cursor)
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    dropped = []
    for table, idx_name in indexes:
        try:
            cursor.execute(f"DROP INDEX `{idx_name}` ON `{table}`")
            dropped.append((table, idx_name))
        except mysql.connector.Error:
            pass
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    return dropped


def restore_fk_indexes(cursor):
    """Re-create the minimum FK indexes MySQL needs by reading FK definitions."""
    cursor.execute("""
        SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION
    """)
    fk_cols = cursor.fetchall()
    created = set()
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    for table, column, constraint in fk_cols:
        key = (table, column)
        if key not in created:
            try:
                cursor.execute(f"CREATE INDEX `fk_{table}_{column}` ON `{table}` (`{column}`)")
                created.add(key)
            except mysql.connector.Error:
                pass  # already exists or covered by another index
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")


def format_explain(explain_rows):
    """Return a compact string summary of EXPLAIN output."""
    parts = []
    for row in explain_rows:
        table = row.get("table", "?")
        access = row.get("type", "?")
        key = row.get("key", "None")
        rows_est = row.get("rows", "?")
        extra = row.get("Extra", "")
        parts.append(f"{table}: type={access}, key={key}, rows={rows_est}, extra={extra}")
    return " | ".join(parts)


def format_explain_analyze(ea_result):
    """Return a compact string summary of EXPLAIN ANALYZE output."""
    parts = []
    for node in ea_result.get("nodes", []):
        op = node["operation"][:50]
        actual_rows = node["actual_rows"]
        loops = node["loops"]
        time_ms = node["actual_time_end"]
        scan = node["scan_type"]
        parts.append(f"[{scan}] {op} (rows={actual_rows}, time={time_ms:.3f}ms, loops={loops})")
    return " | ".join(parts)


# ---------------------------------------------------------------------------
# Main benchmark
# ---------------------------------------------------------------------------

def main():
    index_stmts = _parse_index_statements(INDEX_FILE)
    index_pairs = _extract_index_names(index_stmts)

    conn = get_connection()
    cursor = conn.cursor()

    # Generate bulk data so MySQL optimizer actually uses indexes
    bulk_generated = generate_bulk_data(cursor)
    conn.commit()

    # Ensure all indexes are applied upfront — we use IGNORE INDEX hints
    # in sql_before to simulate the "no index" state instead of actually
    # dropping/recreating indexes each iteration.
    print("Applying all indexes...")
    apply_indexes(cursor, index_stmts)
    conn.commit()

    # ANALYZE all relevant tables so optimizer has up-to-date statistics
    all_tables = {p[1] for p in index_pairs}
    for tbl in all_tables:
        try:
            cursor.execute(f"ANALYZE TABLE {tbl}")
            cursor.fetchall()
        except Exception:
            pass

    results = []

    print(f"\nBenchmarking {len(QUERIES)} queries  ({NUM_RUNS} runs each)\n")
    print("=" * 100)

    for i, q in enumerate(QUERIES, 1):
        name = q["name"]
        sql_before = q["sql_before"]
        sql_after = q["sql_after"]
        print(f"\n[{i}/{len(QUERIES)}] {name}")
        print(f"  {q['description']}")

        # --- BEFORE: query with IGNORE INDEX hints (simulates no indexes) ---
        explain_before = run_explain(cursor, sql_before)
        ea_before = run_explain_analyze(cursor, sql_before)
        time_before = measure_time(cursor, sql_before)

        # --- AFTER: normal query (uses indexes) ---
        explain_after = run_explain(cursor, sql_after)
        ea_after = run_explain_analyze(cursor, sql_after)
        time_after = measure_time(cursor, sql_after)

        # --- Compute speedup ---
        if time_before > 0:
            speedup = ((time_before - time_after) / time_before) * 100
        else:
            speedup = 0.0

        # Extract scan types from EXPLAIN ANALYZE
        scan_types_before = [n["scan_type"] for n in ea_before["nodes"]
                             if n["scan_type"] not in ("Sort", "Filter", "Aggregate", "Nested Loop Join", "Limit", "Other")]
        scan_types_after = [n["scan_type"] for n in ea_after["nodes"]
                            if n["scan_type"] not in ("Sort", "Filter", "Aggregate", "Nested Loop Join", "Limit", "Other")]

        result = {
            "name": name,
            "description": q["description"],
            "time_before_ms": round(time_before, 4),
            "time_after_ms": round(time_after, 4),
            "speedup_pct": round(speedup, 2),
            "explain_before": explain_before,
            "explain_after": explain_after,
            "explain_before_summary": format_explain(explain_before),
            "explain_after_summary": format_explain(explain_after),
            # EXPLAIN ANALYZE data
            "explain_analyze_before": {
                "tree_text": ea_before["tree_text"],
                "total_time_ms": round(ea_before["total_time_ms"], 4),
                "nodes": ea_before["nodes"],
            },
            "explain_analyze_after": {
                "tree_text": ea_after["tree_text"],
                "total_time_ms": round(ea_after["total_time_ms"], 4),
                "nodes": ea_after["nodes"],
            },
            "scan_types_before": scan_types_before,
            "scan_types_after": scan_types_after,
            "planning_time_before_ms": round(ea_before["total_time_ms"], 4),
            "execution_time_before_ms": round(time_before, 4),
            "planning_time_after_ms": round(ea_after["total_time_ms"], 4),
            "execution_time_after_ms": round(time_after, 4),
        }
        results.append(result)

        print(f"  Before: {time_before:.4f} ms  |  After: {time_after:.4f} ms  |  Speedup: {speedup:+.2f}%")
        print(f"  EXPLAIN ANALYZE before (total): {ea_before['total_time_ms']:.4f} ms")
        print(f"  EXPLAIN ANALYZE after  (total): {ea_after['total_time_ms']:.4f} ms")
        print(f"  Scan types before: {scan_types_before}")
        print(f"  Scan types after:  {scan_types_after}")
        print(f"  EXPLAIN before: {format_explain(explain_before)}")
        print(f"  EXPLAIN after:  {format_explain(explain_after)}")

    cursor.close()
    conn.close()

    # -----------------------------------------------------------------------
    # Console summary table
    # -----------------------------------------------------------------------
    print("\n" + "=" * 120)
    print(f"{'Query':<30} {'Exec Before':>12} {'Exec After':>12} {'Speedup':>10} {'EA Before':>12} {'EA After':>12} {'Scan Before':<25} {'Scan After':<25}")
    print("-" * 120)
    for r in results:
        sb = ", ".join(r.get("scan_types_before", [])[:3]) or "N/A"
        sa = ", ".join(r.get("scan_types_after", [])[:3]) or "N/A"
        ea_b = r.get("planning_time_before_ms", 0)
        ea_a = r.get("planning_time_after_ms", 0)
        print(f"{r['name']:<30} {r['time_before_ms']:>12.4f} {r['time_after_ms']:>12.4f} {r['speedup_pct']:>+9.2f}% {ea_b:>12.4f} {ea_a:>12.4f} {sb:<25} {sa:<25}")
    print("=" * 120)

    avg_speedup = sum(r["speedup_pct"] for r in results) / len(results) if results else 0
    print(f"Average speedup: {avg_speedup:+.2f}%\n")

    # -----------------------------------------------------------------------
    # Save JSON
    # -----------------------------------------------------------------------
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmark_results.json")
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Results saved to {json_path}")

    # -----------------------------------------------------------------------
    # Generate charts
    # -----------------------------------------------------------------------
    charts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmarks")
    os.makedirs(charts_dir, exist_ok=True)

    names = [r["name"] for r in results]
    before_times = [r["time_before_ms"] for r in results]
    after_times = [r["time_after_ms"] for r in results]
    speedups = [r["speedup_pct"] for r in results]

    # --- Chart 1: Grouped bar chart  (before vs after) ---
    fig, ax = plt.subplots(figsize=(14, 7))
    x = np.arange(len(names))
    width = 0.35

    bars1 = ax.bar(x - width / 2, before_times, width, label="Before Indexing", color="#EF4444", alpha=0.85)
    bars2 = ax.bar(x + width / 2, after_times, width, label="After Indexing", color="#22C55E", alpha=0.85)

    ax.set_xlabel("Query", fontsize=12)
    ax.set_ylabel("Avg Execution Time (ms)", fontsize=12)
    ax.set_title("Query Performance: Before vs After Indexing", fontsize=14, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=35, ha="right", fontsize=9)
    ax.legend(fontsize=11)
    ax.grid(axis="y", alpha=0.3)

    # Add value labels on bars
    for bar in bars1:
        h = bar.get_height()
        ax.annotate(f"{h:.3f}", xy=(bar.get_x() + bar.get_width() / 2, h),
                     xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=7)
    for bar in bars2:
        h = bar.get_height()
        ax.annotate(f"{h:.3f}", xy=(bar.get_x() + bar.get_width() / 2, h),
                     xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=7)

    fig.tight_layout()
    chart1_path = os.path.join(charts_dir, "before_vs_after.png")
    fig.savefig(chart1_path, dpi=150)
    plt.close(fig)
    print(f"Chart saved: {chart1_path}")

    # --- Chart 2: Speedup percentage bar chart ---
    fig2, ax2 = plt.subplots(figsize=(14, 7))
    colors = ["#22C55E" if s >= 0 else "#EF4444" for s in speedups]
    bars3 = ax2.bar(x, speedups, 0.6, color=colors, alpha=0.85)

    ax2.set_xlabel("Query", fontsize=12)
    ax2.set_ylabel("Speedup (%)", fontsize=12)
    ax2.set_title("Index Speedup by Query", fontsize=14, fontweight="bold")
    ax2.set_xticks(x)
    ax2.set_xticklabels(names, rotation=35, ha="right", fontsize=9)
    ax2.axhline(y=0, color="black", linewidth=0.5)
    ax2.grid(axis="y", alpha=0.3)

    for bar, val in zip(bars3, speedups):
        h = bar.get_height()
        ax2.annotate(f"{val:+.1f}%", xy=(bar.get_x() + bar.get_width() / 2, h),
                      xytext=(0, 3 if h >= 0 else -12), textcoords="offset points",
                      ha="center", va="bottom" if h >= 0 else "top", fontsize=9, fontweight="bold")

    fig2.tight_layout()
    chart2_path = os.path.join(charts_dir, "speedup_pct.png")
    fig2.savefig(chart2_path, dpi=150)
    plt.close(fig2)
    print(f"Chart saved: {chart2_path}")

    # --- Chart 3: EXPLAIN key usage comparison (horizontal) ---
    fig3, (ax3a, ax3b) = plt.subplots(1, 2, figsize=(16, 7))

    before_keys = []
    after_keys = []
    for r in results:
        bk = set()
        for e in r["explain_before"]:
            if e.get("key"):
                bk.add(e["key"])
        before_keys.append(", ".join(bk) if bk else "None")

        ak = set()
        for e in r["explain_after"]:
            if e.get("key"):
                ak.add(e["key"])
        after_keys.append(", ".join(ak) if ak else "None")

    # Before
    ax3a.set_title("Keys Used BEFORE Indexing", fontsize=12, fontweight="bold")
    ax3a.barh(range(len(names)), [1] * len(names), color="#FCA5A5", alpha=0.5)
    for i, (n, k) in enumerate(zip(names, before_keys)):
        ax3a.text(0.05, i, f"{n}:  {k}", va="center", fontsize=8)
    ax3a.set_yticks([])
    ax3a.set_xticks([])
    ax3a.set_xlim(0, 1)

    # After
    ax3b.set_title("Keys Used AFTER Indexing", fontsize=12, fontweight="bold")
    ax3b.barh(range(len(names)), [1] * len(names), color="#BBF7D0", alpha=0.5)
    for i, (n, k) in enumerate(zip(names, after_keys)):
        ax3b.text(0.05, i, f"{n}:  {k}", va="center", fontsize=8)
    ax3b.set_yticks([])
    ax3b.set_xticks([])
    ax3b.set_xlim(0, 1)

    fig3.suptitle("EXPLAIN Key Usage Comparison", fontsize=14, fontweight="bold")
    fig3.tight_layout()
    chart3_path = os.path.join(charts_dir, "explain_keys.png")
    fig3.savefig(chart3_path, dpi=150)
    plt.close(fig3)
    print(f"Chart saved: {chart3_path}")

    # --- Chart 4: Scan Type Comparison ---
    fig4, (ax4a, ax4b) = plt.subplots(1, 2, figsize=(16, 7))

    before_scans = []
    after_scans = []
    for r in results:
        bs = r.get("scan_types_before", [])
        before_scans.append(", ".join(bs[:3]) if bs else "N/A")
        ascan = r.get("scan_types_after", [])
        after_scans.append(", ".join(ascan[:3]) if ascan else "N/A")

    # Color-code: red for table scans, green for index lookups
    def scan_color(scan_str):
        if 'Table Scan' in scan_str:
            return '#FCA5A5'  # red
        elif 'Index Scan' in scan_str:
            return '#FDE68A'  # yellow
        elif 'Lookup' in scan_str:
            return '#BBF7D0'  # green
        else:
            return '#E5E7EB'  # gray

    # Before
    ax4a.set_title("Scan Types BEFORE Indexing", fontsize=12, fontweight="bold")
    bar_colors_b = [scan_color(s) for s in before_scans]
    ax4a.barh(range(len(names)), [1] * len(names), color=bar_colors_b, alpha=0.7)
    for i, (n, s) in enumerate(zip(names, before_scans)):
        ax4a.text(0.02, i, f"{n}:  {s}", va="center", fontsize=8)
    ax4a.set_yticks([])
    ax4a.set_xticks([])
    ax4a.set_xlim(0, 1)

    # After
    ax4b.set_title("Scan Types AFTER Indexing", fontsize=12, fontweight="bold")
    bar_colors_a = [scan_color(s) for s in after_scans]
    ax4b.barh(range(len(names)), [1] * len(names), color=bar_colors_a, alpha=0.7)
    for i, (n, s) in enumerate(zip(names, after_scans)):
        ax4b.text(0.02, i, f"{n}:  {s}", va="center", fontsize=8)
    ax4b.set_yticks([])
    ax4b.set_xticks([])
    ax4b.set_xlim(0, 1)

    fig4.suptitle("EXPLAIN ANALYZE: Scan Type Comparison", fontsize=14, fontweight="bold")
    fig4.tight_layout()
    chart4_path = os.path.join(charts_dir, "scan_types.png")
    fig4.savefig(chart4_path, dpi=150)
    plt.close(fig4)
    print(f"Chart saved: {chart4_path}")

    # --- Chart 5: EXPLAIN ANALYZE actual time (planning+execution) ---
    fig5, ax5 = plt.subplots(figsize=(14, 7))
    ea_before_times = [r.get("planning_time_before_ms", 0) for r in results]
    ea_after_times = [r.get("planning_time_after_ms", 0) for r in results]

    bars5a = ax5.bar(x - width / 2, ea_before_times, width, label="EXPLAIN ANALYZE Before", color="#F97316", alpha=0.85)
    bars5b = ax5.bar(x + width / 2, ea_after_times, width, label="EXPLAIN ANALYZE After", color="#3B82F6", alpha=0.85)

    ax5.set_xlabel("Query", fontsize=12)
    ax5.set_ylabel("EXPLAIN ANALYZE Total Time (ms)", fontsize=12)
    ax5.set_title("EXPLAIN ANALYZE: Actual Execution Time Before vs After Indexing", fontsize=14, fontweight="bold")
    ax5.set_xticks(x)
    ax5.set_xticklabels(names, rotation=35, ha="right", fontsize=9)
    ax5.legend(fontsize=11)
    ax5.grid(axis="y", alpha=0.3)

    for bar in bars5a:
        h = bar.get_height()
        if h > 0:
            ax5.annotate(f"{h:.2f}", xy=(bar.get_x() + bar.get_width() / 2, h),
                         xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=7)
    for bar in bars5b:
        h = bar.get_height()
        if h > 0:
            ax5.annotate(f"{h:.2f}", xy=(bar.get_x() + bar.get_width() / 2, h),
                         xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=7)

    fig5.tight_layout()
    chart5_path = os.path.join(charts_dir, "explain_analyze_times.png")
    fig5.savefig(chart5_path, dpi=150)
    plt.close(fig5)
    print(f"Chart saved: {chart5_path}")

    # Clean up bulk data so it doesn't affect the app
    if bulk_generated:
        print("Cleaning up benchmark data...")
        conn2 = get_connection()
        c2 = conn2.cursor()
        cleanup_bulk_data(c2)
        conn2.commit()
        c2.close()
        conn2.close()

    print("\nBenchmark complete.")


if __name__ == "__main__":
    main()
