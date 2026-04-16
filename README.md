# IITGN Connect — College Social Media Platform

**CS 432 Databases | Assignment 2 - Module B**
**Indian Institute of Technology, Gandhinagar**

---

## Table of Contents

- [Project Overview](#project-overview)
- [Setup & Replicability](#setup--replicability)
- [1. Database Schema, API & Session Management](#1-database-schema-api--session-management)
- [2. Security, Access Control & Audit Logging](#2-security-access-control--audit-logging)
- [3. Indexing & Query Optimization](#3-indexing--query-optimization)
- [4. Benchmarking Report & EXPLAIN Analysis](#4-benchmarking-report--explain-analysis)
- [5. Module B: Multi-User Behaviour and Stress Testing](#5-module-b-multi-user-behaviour-and-stress-testing)
- [6. Video Walkthrough](#6-video-walkthrough)

---

## Project Overview

IITGN Connect is a full-stack college social media platform built with **React** (frontend) and **Flask** (backend) using **MySQL** with **raw SQL queries** (no ORM). It features user authentication with email OTP verification, role-based access control, group management, job postings, polls, attendance tracking, and comprehensive audit logging with unauthorized access detection.

---

## Setup & Replicability

### Prerequisites

- **Python 3.10+** — [python.org/downloads](https://www.python.org/downloads/)
- **MySQL 8.0+** — [dev.mysql.com/downloads](https://dev.mysql.com/downloads/mysql/)
- **Node.js 18+** and **npm** — [nodejs.org](https://nodejs.org/)

### Project Structure

```
Databases Ass2/
├── app/
│   ├── backend/            # Flask API server
│   │   ├── app.py          # Entry point (port 5001)
│   │   ├── config.py       # DB + SMTP configuration
│   │   ├── db.py           # MySQL query helpers (raw SQL)
│   │   ├── seed.py         # Database schema + sample data + triggers
│   │   ├── audit.py        # Audit logging (file + DB)
│   │   ├── email_service.py# OTP email service
│   │   ├── benchmark.py    # Performance benchmarking script
│   │   ├── .env            # Environment variables (SMTP, DB)
│   │   ├── routes/         # API route blueprints
│   │   │   ├── auth.py     # Login, register, OTP, forgot password
│   │   │   ├── posts.py    # Posts, comments, likes
│   │   │   ├── groups.py   # Groups, memberships, approvals
│   │   │   ├── jobs.py     # Job postings, referrals
│   │   │   ├── polls.py    # Polls and voting
│   │   │   ├── attendance.py # Class & mess attendance
│   │   │   ├── profile.py  # User profiles, claims
│   │   │   ├── members.py  # Member search
│   │   │   ├── admin.py    # Admin dashboard + SQL console
│   │   │   └── settings.py # Profile settings, password, privacy
│   │   ├── uploads/        # User-uploaded images
│   │   └── benchmarks/     # Generated benchmark charts
│   │
│   └── iitgn-connect/      # React frontend
│       ├── src/
│       │   ├── pages/      # All page components
│       │   ├── components/ # Reusable UI components
│       │   ├── contexts/   # Auth context provider
│       │   ├── api.js      # Centralized API helper
│       │   └── App.jsx     # Route definitions
│       ├── package.json
│       └── vite.config.js
│
├── logs/                   # Audit log files
│   └── audit.log
├── sql/                    # SQL files
│   ├── schema.sql          # All CREATE TABLE statements
│   └── indexes.sql         # Performance indexes (26 indexes)
├── report.ipynb            # Optimization report (Jupyter notebook)
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

### Quick Start

**1. Start MySQL**

```bash
brew services start mysql          # macOS
sudo systemctl start mysql         # Linux
```

**2. Backend Setup**

```bash
python3 -m venv venv
source venv/bin/activate           # macOS / Linux  (or venv\Scripts\activate on Windows)
pip install -r requirements.txt
```

**3. Configure Environment**

Edit `app/backend/.env` with your MySQL and SMTP credentials:

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=root
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=anonymous.cse.iitgn@gmail.com
SMTP_PASSWORD=<gmail-app-password>
```

> For Gmail SMTP, use a [Google App Password](https://support.google.com/accounts/answer/185833). OTP features require valid SMTP credentials.

**4. Seed the Database**

```bash
cd app/backend
python seed.py
```

Creates all 22 tables, 63 audit triggers, and sample data.

**5. Start the Backend**

```bash
python app.py
# API server at http://localhost:5001
```

**6. Start the Frontend** (new terminal)

```bash
cd app/iitgn-connect
npm install
npm run dev
# Frontend at http://localhost:5173
```

**7. Open** http://localhost:5173 in your browser.

### Default Login Credentials

All seed users share the password: **`password123`**

| Username       | Name                 | Type         | Admin |
| -------------- | -------------------- | ------------ | ----- |
| `admin_user`   | System Admin         | Student      | Yes   |
| `laksh_jain`   | Laksh Jain           | Student      | No    |
| `parthiv_p`    | Parthiv Patel        | Student      | No    |
| `ridham_p`     | Ridham Patel         | Student      | No    |
| `shriniket_b`  | Shriniket Behera     | Student      | No    |
| `rudra_s`      | Rudra Singh          | Student      | No    |
| `prof_yogesh`  | Dr. Yogesh K. Meena  | Professor    | No    |
| `prof_anirban` | Dr. Anirban Dasgupta | Professor    | No    |
| `alumni_rahul` | Rahul Sharma         | Alumni       | No    |
| `alumni_priya` | Priya Verma          | Alumni       | No    |
| `techclub`     | Technical Club IITGN | Organization | No    |

You can also log in with email (e.g., `laksh.jain@iitgn.ac.in`).

### Troubleshooting

| Problem                         | Solution                                                |
| ------------------------------- | ------------------------------------------------------- |
| `ModuleNotFoundError`           | Make sure venv is activated: `source venv/bin/activate` |
| `Access denied for user 'root'` | Update MySQL credentials in `app/backend/.env`          |
| `Can't connect to MySQL server` | Start MySQL: `brew services start mysql`                |
| `Port 5001 already in use`      | `lsof -ti :5001 \| xargs kill -9`                       |
| `Port 5173 already in use`      | `lsof -ti :5173 \| xargs kill -9`                       |
| OTP email not received          | Check SMTP credentials in `.env`                        |

---

## 1. Database Schema, API & Session Management

### Tech Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React 19, Vite 8, React Router 7         |
| Backend  | Flask, Flask-JWT-Extended, Flask-CORS    |
| Database | MySQL 8.0+ (raw SQL, no ORM)             |
| Auth     | JWT (JSON Web Tokens), bcrypt, Email OTP |
| Email    | Gmail SMTP (python-dotenv)               |

### Database Schema (22 Tables)

All tables are defined in `sql/schema.sql`. The schema uses strict normalization with ISA hierarchy, composite primary keys, and cascading foreign keys.

| Category                 | Tables                                                                            |
| ------------------------ | --------------------------------------------------------------------------------- |
| **Core (ISA Hierarchy)** | `Member` (supertype), `Student`, `Professor`, `Alumni`, `Organization` (subtypes) |
| **Content**              | `Post`, `Comment`, `PostLike`, `Poll`, `PollOption`, `PollVote`                   |
| **Groups**               | `CampusGroup`, `GroupMembership`                                                  |
| **Academic**             | `Course`, `Enrollment`, `ClassAttendance`, `MessAttendance`                       |
| **Jobs**                 | `JobPost`, `ReferralRequest`                                                      |
| **Profile**              | `ProfileClaimQuestion`, `ProfileClaimVote`                                        |
| **Security**             | `AuditLog`, `OTPVerification`                                                     |

**Data Integrity Strategy:**

- ISA hierarchy: Member is the supertype; Student/Professor/Alumni/Organization share `MemberID` as both PK and FK with `ON DELETE CASCADE`
- No credential duplication: login data stored only in `Member` table
- Cascade deletes on all FK relationships — deleting a Member removes all dependent data automatically
- Composite PKs for join tables: `(PostID, MemberID)` on PostLike, `(GroupID, MemberID)` on GroupMembership, `(StudentID, CourseID, Semester)` on Enrollment

### CRUD API Endpoints

The backend exposes **40+ RESTful API endpoints** across 10 route blueprints. All data-modifying endpoints use raw SQL (no ORM).

| Method | Endpoint                        | Description                     | Auth   |
| ------ | ------------------------------- | ------------------------------- | ------ |
| POST   | `/api/auth/login`               | Login (username or email)       | Public |
| POST   | `/api/auth/register`            | Register new account            | Public |
| POST   | `/api/auth/send-otp`            | Send OTP to email               | Public |
| POST   | `/api/auth/verify-otp`          | Verify OTP code                 | Public |
| POST   | `/api/auth/forgot-password`     | Request password reset OTP      | Public |
| POST   | `/api/auth/reset-password`      | Reset password with OTP         | Public |
| GET    | `/api/auth/isAuth`              | Check token validity            | JWT    |
| GET    | `/api/posts`                    | Get feed (global or groups)     | JWT    |
| POST   | `/api/posts`                    | Create post (with image upload) | JWT    |
| PUT    | `/api/posts/:id`                | Update post (author only)       | JWT    |
| DELETE | `/api/posts/:id`                | Delete post (author/admin)      | JWT    |
| POST   | `/api/posts/:id/like`           | Toggle like                     | JWT    |
| GET    | `/api/posts/:id/comments`       | Get comments                    | JWT    |
| POST   | `/api/posts/:id/comments`       | Add comment                     | JWT    |
| PUT    | `/api/comments/:id`             | Edit comment (author only)      | JWT    |
| DELETE | `/api/comments/:id`             | Delete comment (author/admin)   | JWT    |
| GET    | `/api/groups/`                  | List all groups                 | JWT    |
| POST   | `/api/groups/`                  | Create group                    | JWT    |
| PUT    | `/api/groups/:id`               | Update group (admin only)       | JWT    |
| DELETE | `/api/groups/:id`               | Delete group (admin only)       | JWT    |
| POST   | `/api/groups/:id/join`          | Join group                      | JWT    |
| POST   | `/api/groups/:id/leave`         | Leave group                     | JWT    |
| GET    | `/api/groups/:id/pending`       | Pending requests (group admin)  | JWT    |
| POST   | `/api/groups/:id/approve/:mid`  | Approve member (group admin)    | JWT    |
| POST   | `/api/groups/:id/reject/:mid`   | Reject member (group admin)     | JWT    |
| POST   | `/api/groups/:id/kick/:mid`     | Kick member (group admin)       | JWT    |
| GET    | `/api/jobs`                     | List job postings               | JWT    |
| POST   | `/api/jobs`                     | Post job (alumni only)          | JWT    |
| PUT    | `/api/jobs/:id`                 | Update job (author only)        | JWT    |
| DELETE | `/api/jobs/:id`                 | Delete job (author/admin)       | JWT    |
| GET    | `/api/referrals`                | Get referral requests           | JWT    |
| POST   | `/api/referrals`                | Create referral request         | JWT    |
| PUT    | `/api/referrals/:id`            | Update referral status          | JWT    |
| GET    | `/api/polls/`                   | List polls                      | JWT    |
| POST   | `/api/polls/`                   | Create poll                     | JWT    |
| POST   | `/api/polls/:id/vote`           | Vote on poll                    | JWT    |
| GET    | `/api/attendance/class`         | Class attendance records        | JWT    |
| GET    | `/api/attendance/mess`          | Mess attendance records         | JWT    |
| GET    | `/api/attendance/streaks`       | Attendance streaks              | JWT    |
| GET    | `/api/attendance/leaderboard`   | Streak leaderboard              | JWT    |
| GET    | `/api/profile/:id`              | Get user profile                | JWT    |
| POST   | `/api/claims`                   | Create profile claim            | JWT    |
| PUT    | `/api/claims/:id`               | Edit profile claim              | JWT    |
| DELETE | `/api/claims/:id`               | Delete profile claim            | JWT    |
| POST   | `/api/claims/:id/vote`          | Vote on claim                   | JWT    |
| GET    | `/api/members/`                 | Search/filter members           | JWT    |
| PUT    | `/api/settings/profile`         | Update profile                  | JWT    |
| PUT    | `/api/settings/password`        | Change password                 | JWT    |
| PUT    | `/api/settings/change-username` | Change username (OTP required)  | JWT    |
| GET    | `/api/settings/privacy`         | Get privacy settings            | JWT    |
| PUT    | `/api/settings/privacy`         | Update privacy settings         | JWT    |
| DELETE | `/api/settings/account`         | Delete account                  | JWT    |
| GET    | `/api/admin/stats`              | System statistics               | Admin  |
| GET    | `/api/admin/members`            | List all members                | Admin  |
| PUT    | `/api/admin/members/:id`        | Update member role              | Admin  |
| DELETE | `/api/admin/members/:id`        | Delete member                   | Admin  |
| DELETE | `/api/admin/groups/:id`         | Delete group                    | Admin  |
| POST   | `/api/admin/query`              | Execute SQL query               | Admin  |

### Session Validation

- **JWT Authentication**: Every protected endpoint requires a valid JWT token via `@jwt_required()` decorator
- **Token Structure**: JWT identity = `MemberID`, 24-hour expiry
- **Token Verification**: `GET /api/auth/isAuth` allows the frontend to validate tokens and retrieve user role/expiry
- **Password Security**: All passwords are hashed with bcrypt + salt; no plaintext storage

### Member Portfolio (Profile)

Each member has a rich profile page (`GET /api/profile/:id`) that aggregates:

- Personal info from `Member` table + subtype-specific details (Student: programme/branch/year; Professor: designation/department; Alumni: organization/graduation year; Organization: type/foundation date)
- Recent posts with like/comment counts
- Group memberships with roles
- Profile Claims (Q&A) with community agree/disagree voting
- Privacy controls: members can toggle visibility of email, contact number, and Q&A section via `PUT /api/settings/privacy`

---

## 2. Security, Access Control & Audit Logging

### Role-Based Access Control (RBAC)

| Role             | Permissions                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin**        | Full CRUD on all members, groups, posts, comments, jobs. Can view system stats dashboard. Can run raw SQL queries. Self-delete protection. |
| **Regular User** | Create/edit/delete **own** posts, comments, and profile claims. View other profiles (read-only). Join/leave groups.                        |
| **Alumni**       | Regular permissions + create/edit/delete job postings, manage incoming referral requests (approve/reject).                                 |
| **Student**      | Regular permissions + submit referral requests, view attendance records.                                                                   |
| **Professor**    | Regular permissions (no extra privileges currently).                                                                                       |
| **Organization** | Regular permissions (no extra privileges currently).                                                                                       |

**RBAC Implementation:**

- **`admin_required()` decorator** (`app/backend/routes/admin.py`): Applied to all `/api/admin/*` endpoints. Queries `IsAdmin` on the `Member` table before allowing access. Non-admin users get `403 Forbidden` and the attempt is logged.
- **Ownership checks**: Edit/delete on posts, comments, profile claims verify `AuthorID == current_user_id` before allowing modification.
- **Type-based restrictions**: Job posting is restricted to `MemberType = 'Alumni'`. Referral requests are restricted to Students. These are enforced in the route handlers.

### Role-Based UI Visibility

| Feature          | Student                 | Alumni            | Professor | Organization | Admin            |
| ---------------- | ----------------------- | ----------------- | --------- | ------------ | ---------------- |
| Jobs & Referrals | View + Request Referral | View + Post Jobs  | Hidden    | Hidden       | View + Delete    |
| My Referrals Tab | Yes                     | Referral Requests | N/A       | N/A          | Hidden           |
| Attendance       | Full                    | Hidden            | Hidden    | Full         | Leaderboard Only |
| Admin Dashboard  | Hidden                  | Hidden            | Hidden    | Hidden       | Full Access      |
| SQL Console      | Hidden                  | Hidden            | Hidden    | Hidden       | Full Access      |

### Proper Deletion Integrity

All foreign key relationships use `ON DELETE CASCADE`, ensuring referential integrity:

- Deleting a **Member** automatically removes their Student/Professor/Alumni/Organization subtype row, all their posts, comments, likes, poll votes, group memberships, job posts, referral requests, profile claims, and claim votes.
- Deleting a **Post** removes all its comments and likes.
- Deleting a **Poll** removes all its options and votes.
- Deleting a **CampusGroup** removes all memberships and unscopes associated posts.
- Admin delete operations are logged in the audit trail.

### Unauthorized Access Logging

IITGN Connect uses a **two-layer security logging system**:

#### Layer 1: Unauthorized API Request Detection (`logs/audit.log`)

Custom JWT error handlers catch and log all unauthorized API access attempts:

```
# Missing JWT token
[USER:UNAUTHORIZED] [ACTION:UNAUTHORIZED_ACCESS] — Missing/invalid JWT on GET /api/posts

# Expired JWT token
[USER:EXPIRED_TOKEN] [ACTION:UNAUTHORIZED_ACCESS] — Expired JWT (user_id=1) on GET /api/posts

# Tampered/fake JWT token
[USER:INVALID_TOKEN] [ACTION:UNAUTHORIZED_ACCESS] — Invalid/tampered JWT on GET /api/posts

# Non-admin accessing admin endpoint (RBAC violation)
[USER:laksh_jain] [ACTION:FORBIDDEN_ACCESS] — Non-admin user 'laksh_jain' attempted GET /api/admin/stats
```

To view unauthorized API attempts:

```bash
grep -E "UNAUTHORIZED|FORBIDDEN|INVALID_TOKEN|EXPIRED_TOKEN" logs/audit.log
```

#### Layer 2: Direct DB Modification Detection (AuditLog table + 63 MySQL Triggers)

63 MySQL triggers (INSERT/UPDATE/DELETE on all 21 tables) detect operations that bypass the API:

- **API-based operations**: `db.py` sets `@app_username` MySQL session variable before every query. Triggers read this and log with `IsAuthorized = TRUE`.
- **Direct SQL access**: `@app_username` is NULL (not set by any API call). Triggers log with `IsAuthorized = FALSE` and `Username = 'DIRECT_DB_ACCESS'`.

```sql
-- Find all unauthorized direct DB modifications:
SELECT * FROM AuditLog WHERE IsAuthorized = FALSE;

-- Test it: run this directly in MySQL CLI (bypasses the API)
UPDATE Post SET Content = 'Hacked!' WHERE PostID = 1;

-- Check the AuditLog — flagged as unauthorized
SELECT * FROM AuditLog WHERE IsAuthorized = FALSE AND Action = 'UPDATE_POST';
```

---

## 3. Indexing & Query Optimization

### Indexing Strategy

We analyzed every SQL query in the Flask API route handlers and identified columns used in WHERE, JOIN, ORDER BY, and correlated subqueries. **26 custom indexes** were created in `sql/indexes.sql`.

| #   | Index Name                                | Table                | Column(s)                          | Query Pattern                                    |
| --- | ----------------------------------------- | -------------------- | ---------------------------------- | ------------------------------------------------ |
| 1   | `idx_post_authorid`                       | Post                 | AuthorID                           | Profile page: posts by author                    |
| 2   | `idx_post_groupid`                        | Post                 | GroupID                            | Group feed: `WHERE GroupID = ?`                  |
| 3   | `idx_post_groupid_createdat`              | Post                 | (GroupID, CreatedAt DESC)          | Group posts sorted by date — eliminates filesort |
| 4   | `idx_post_createdat`                      | Post                 | CreatedAt DESC                     | Global feed: `ORDER BY CreatedAt DESC`           |
| 5   | `idx_post_authorid_createdat`             | Post                 | (AuthorID, CreatedAt DESC)         | Profile: recent posts by author                  |
| 6   | `idx_comment_postid_createdat`            | Comment              | (PostID, CreatedAt ASC)            | Comments per post, sorted chronologically        |
| 7   | `idx_comment_postid`                      | Comment              | PostID                             | Comment count subquery, CASCADE deletes          |
| 8   | `idx_comment_authorid`                    | Comment              | AuthorID                           | JOIN to Member for comment author                |
| 9   | `idx_postlike_memberid`                   | PostLike             | MemberID                           | "Liked posts by user" reverse lookup             |
| 10  | `idx_groupmembership_memberid`            | GroupMembership      | MemberID                           | User's groups lookup                             |
| 11  | `idx_campusgroup_adminid`                 | CampusGroup          | AdminID                            | JOIN to Member for group admin                   |
| 12  | `idx_member_name`                         | Member               | Name                               | Member search: `ORDER BY Name`                   |
| 13  | `idx_member_membertype`                   | Member               | MemberType                         | Member filter: `WHERE MemberType = ?`            |
| 14  | `idx_poll_createdat`                      | Poll                 | CreatedAt DESC                     | Poll listing sorted by date                      |
| 15  | `idx_poll_creatorid`                      | Poll                 | CreatorID                          | JOIN to Member for poll creator                  |
| 16  | `idx_polloption_pollid`                   | PollOption           | PollID                             | Options per poll                                 |
| 17  | `idx_pollvote_memberid`                   | PollVote             | MemberID                           | User's vote check                                |
| 18  | `idx_jobpost_postedat`                    | JobPost              | PostedAt DESC                      | Job listing sorted by date                       |
| 19  | `idx_jobpost_alumniid`                    | JobPost              | AlumniID                           | JOIN to Alumni for poster info                   |
| 20  | `idx_referral_targetalumniid_requestedat` | ReferralRequest      | (TargetAlumniID, RequestedAt DESC) | Alumni referral dashboard                        |
| 21  | `idx_referral_studentid_requestedat`      | ReferralRequest      | (StudentID, RequestedAt DESC)      | Student referral history                         |
| 22  | `idx_classattendance_studentid_date`      | ClassAttendance      | (StudentID, RecordDate)            | Attendance by student + date range               |
| 23  | `idx_classattendance_courseid`            | ClassAttendance      | CourseID                           | JOIN to Course                                   |
| 24  | `idx_messattendance_studentid_date`       | MessAttendance       | (StudentID, RecordDate)            | Mess attendance by student + date                |
| 25  | `idx_profileclaim_memberid`               | ProfileClaimQuestion | MemberID                           | Claims per member profile                        |
| 26  | `idx_enrollment_courseid`                 | Enrollment           | CourseID                           | Course detail lookups                            |

**Index types used:**

- **Single-column indexes**: Simple WHERE/JOIN lookups (e.g., `idx_post_authorid`)
- **Composite indexes**: Filter + sort on different columns (e.g., `idx_post_groupid_createdat` covers `WHERE GroupID = ? ORDER BY CreatedAt DESC`)
- **Descending indexes**: MySQL 8.0+ DESC key parts for `ORDER BY ... DESC` optimization

### Query Profiling & Benchmarking

The benchmarking script (`app/backend/benchmark.py`) measures performance across **10 representative queries** covering the most critical API endpoints:

1. **Global Post Feed** — full feed with author info, like/comment counts
2. **Group Posts** — group-filtered feed with counts
3. **Post Comments** — comments per post with author details
4. **User Profile Posts** — recent posts by a member
5. **Class Attendance** — monthly attendance with course info
6. **Mess Attendance** — monthly mess records
7. **Job Listings** — all jobs with alumni info
8. **Referral Requests** — alumni's incoming referrals
9. **Polls with Options & Votes** — poll listing with creator info
10. **Member Search by Type** — filtered member directory

**Methodology:**

- Bulk data generation (~2000 posts, 5000 comments, 8000 likes, 10000+ attendance records) to ensure MySQL optimizer uses indexes
- `IGNORE INDEX` hints in "before" queries to simulate no-index state
- Normal queries for "after" state (using all indexes)
- 100 iterations per query for statistical reliability
- EXPLAIN analysis to verify access type changes

**Results Summary:**

| Query              | Before (ms) | After (ms) | Speedup    |
| ------------------ | ----------- | ---------- | ---------- |
| Global Post Feed   | 3112.32     | 12.74      | **+99.6%** |
| Group Posts        | 551.62      | 2.20       | **+99.6%** |
| Post Comments      | 1.66        | 0.14       | **+91.7%** |
| User Profile Posts | 9.57        | 0.24       | **+97.5%** |
| Class Attendance   | 3.46        | 0.84       | **+75.6%** |
| Mess Attendance    | 2.77        | 1.05       | **+62.1%** |
| Job Listings       | 0.68        | 0.71       | -3.5%      |
| Referral Requests  | 0.24        | 0.13       | **+44.7%** |
| Polls              | 0.54        | 0.56       | -4.2%      |
| Member Search      | 0.72        | 0.80       | -11.1%     |
| **Average**        |             |            | **+55.2%** |

The top queries (Global Feed, Group Posts, Profile Posts) show **95-99%+ speedup** because they involve correlated subqueries and JOINs across large tables where indexes eliminate full table scans.

To run benchmarks yourself:

```bash
cd app/backend
python benchmark.py
```

---

## 4. Benchmarking Report & EXPLAIN Analysis

The full optimization report is in **`report.ipynb`** (Jupyter Notebook). It contains:

1. **Schema Design** — ER summary, table descriptions, data integrity strategy
2. **Security — Session Validation & RBAC** — JWT flow, role permissions, audit logging mechanism
3. **Indexing Strategy** — All 26 indexes with rationale tied to specific query patterns
4. **Performance Benchmarking** — Execution time comparison table, before vs after bar charts, speedup percentage chart
5. **EXPLAIN Plan Analysis** — Side-by-side EXPLAIN output for each query showing:
   - Access type changes (`ALL` → `ref`, `eq_ref`)
   - Key usage changes (`None` → custom index names)
   - Row estimate reductions
   - Filesort elimination

### Generated Charts (in `app/backend/benchmarks/`)

| Chart                 | Description                                    |
| --------------------- | ---------------------------------------------- |
| `before_vs_after.png` | Grouped bar chart comparing execution times    |
| `speedup_pct.png`     | Speedup percentage per query                   |
| `explain_keys.png`    | EXPLAIN key usage comparison (before vs after) |

To regenerate the report:

```bash
# First run the benchmark
cd app/backend
python benchmark.py

# Then open the notebook
jupyter notebook report.ipynb
# Re-run all cells
```

---

## 5. Video Walkthrough

> **Video Link:** [ VIDEO LINK WILL BE ADDED ]

The video demonstration covers:

1. **UI & API Functionality** — Walkthrough of all features: login, feed, posts, comments, likes, groups, polls, jobs, referrals, attendance, profiles, settings
2. **RBAC Enforcement** — Side-by-side comparison of Admin vs Regular User login showing different sidebar options, restricted endpoints, and forbidden access handling
3. **Security Logging** — Demonstration of:
   - Unauthorized API access attempts (expired/missing/tampered tokens)
   - RBAC violation logging (non-admin accessing admin endpoints)
   - Direct DB modification detection via MySQL triggers

---

## Team

- Parthiv Patel
- Shriniket Behera
- Ridham Patel
- Laksh Jain
- Rudra Pratap Singh

**Course:** CS 432 — Databases (Semester II, 2025-2026)
**Institute:** Indian Institute of Technology, Gandhinagar
