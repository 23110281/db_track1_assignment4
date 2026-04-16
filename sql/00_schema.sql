-- ============================================================
-- IITGN Connect - CS432 Database Schema
-- ============================================================
-- Generated from backend/seed.py
-- Tables are ordered by dependency (referenced tables first).
-- ============================================================

CREATE DATABASE IF NOT EXISTS iitgn_connect;
USE iitgn_connect;

-- ------------------------------------------------------------
-- Member: Base table for all users (students, professors, alumni, orgs).
-- Every user in the system has exactly one row here.
-- ------------------------------------------------------------
CREATE TABLE Member (
    MemberID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(256) NOT NULL,
    MemberType ENUM('Student','Professor','Alumni','Organization') NOT NULL,
    ContactNumber VARCHAR(15),
    CreatedAt DATE NOT NULL,
    AvatarColor VARCHAR(10) DEFAULT '#4F46E5',
    IsAdmin BOOLEAN DEFAULT FALSE,
    Address VARCHAR(255) DEFAULT '',
    ShowAddress BOOLEAN DEFAULT FALSE,
    ShowEmail BOOLEAN DEFAULT TRUE,
    ShowContact BOOLEAN DEFAULT TRUE,
    AllowQnA BOOLEAN DEFAULT TRUE
);

-- ------------------------------------------------------------
-- Student: ISA relationship -- stores attributes specific to students.
-- ------------------------------------------------------------
CREATE TABLE Student (
    MemberID INT PRIMARY KEY,
    Programme VARCHAR(20) NOT NULL,
    Branch VARCHAR(50) NOT NULL,
    CurrentYear INT NOT NULL,
    MessAssignment VARCHAR(20),
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Professor: ISA relationship -- stores attributes specific to professors.
-- ------------------------------------------------------------
CREATE TABLE Professor (
    MemberID INT PRIMARY KEY,
    Designation VARCHAR(50) NOT NULL,
    Department VARCHAR(50) NOT NULL,
    JoiningDate DATE NOT NULL,
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Alumni: ISA relationship -- stores attributes specific to alumni.
-- ------------------------------------------------------------
CREATE TABLE Alumni (
    MemberID INT PRIMARY KEY,
    CurrentOrganization VARCHAR(100),
    GraduationYear INT NOT NULL,
    Verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Organization: ISA relationship -- stores attributes specific to campus organizations.
-- ------------------------------------------------------------
CREATE TABLE Organization (
    MemberID INT PRIMARY KEY,
    OrgType VARCHAR(50) NOT NULL,
    FoundationDate DATE NOT NULL,
    ContactEmail VARCHAR(100),
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Course: Academic courses offered at IITGN, each optionally linked to a professor.
-- ------------------------------------------------------------
CREATE TABLE Course (
    CourseID INT AUTO_INCREMENT PRIMARY KEY,
    CourseCode VARCHAR(10) NOT NULL,
    CourseName VARCHAR(100) NOT NULL,
    CourseSlot VARCHAR(5),
    ProfessorID INT,
    FOREIGN KEY (ProfessorID) REFERENCES Professor(MemberID) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Enrollment: Many-to-many between Student and Course per semester.
-- ------------------------------------------------------------
CREATE TABLE Enrollment (
    StudentID INT NOT NULL,
    CourseID INT NOT NULL,
    EnrollmentDate DATE NOT NULL,
    Semester VARCHAR(20) NOT NULL,
    Status ENUM('Active','Dropped','Completed') DEFAULT 'Active',
    PRIMARY KEY (StudentID, CourseID, Semester),
    FOREIGN KEY (StudentID) REFERENCES Student(MemberID) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- ClassAttendance: Daily attendance record per student per course.
-- ------------------------------------------------------------
CREATE TABLE ClassAttendance (
    AttendanceID INT AUTO_INCREMENT PRIMARY KEY,
    CourseID INT NOT NULL,
    StudentID INT NOT NULL,
    RecordDate DATE NOT NULL,
    Status ENUM('Present','Absent') NOT NULL,
    FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE,
    FOREIGN KEY (StudentID) REFERENCES Student(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- MessAttendance: Tracks meal attendance (breakfast/lunch/dinner) for students.
-- ------------------------------------------------------------
CREATE TABLE MessAttendance (
    MessRecordID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT NOT NULL,
    RecordDate DATE NOT NULL,
    MealType ENUM('Breakfast','Lunch','Dinner') NOT NULL,
    Status ENUM('Eaten','Missed') NOT NULL,
    FOREIGN KEY (StudentID) REFERENCES Student(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- CampusGroup: Clubs, project teams, batch groups, etc.
-- ------------------------------------------------------------
CREATE TABLE CampusGroup (
    GroupID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    AdminID INT,
    FOREIGN KEY (AdminID) REFERENCES Member(MemberID) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- GroupMembership: Many-to-many between Member and CampusGroup with role.
-- ------------------------------------------------------------
CREATE TABLE GroupMembership (
    GroupID INT NOT NULL,
    MemberID INT NOT NULL,
    Role ENUM('Admin','Moderator','Member') DEFAULT 'Member',
    JoinedAt DATE NOT NULL,
    PRIMARY KEY (GroupID, MemberID),
    FOREIGN KEY (GroupID) REFERENCES CampusGroup(GroupID) ON DELETE CASCADE,
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Post: User-generated posts, optionally scoped to a CampusGroup.
-- ------------------------------------------------------------
CREATE TABLE Post (
    PostID INT AUTO_INCREMENT PRIMARY KEY,
    AuthorID INT NOT NULL,
    GroupID INT,
    Content TEXT NOT NULL,
    ImageURL VARCHAR(500),
    CreatedAt DATETIME NOT NULL,
    FOREIGN KEY (AuthorID) REFERENCES Member(MemberID) ON DELETE CASCADE,
    FOREIGN KEY (GroupID) REFERENCES CampusGroup(GroupID) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Comment: Comments on posts.
-- ------------------------------------------------------------
CREATE TABLE Comment (
    CommentID INT AUTO_INCREMENT PRIMARY KEY,
    PostID INT NOT NULL,
    AuthorID INT NOT NULL,
    Content TEXT NOT NULL,
    CreatedAt DATETIME NOT NULL,
    FOREIGN KEY (PostID) REFERENCES Post(PostID) ON DELETE CASCADE,
    FOREIGN KEY (AuthorID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- PostLike: Many-to-many tracking which members liked which posts.
-- ------------------------------------------------------------
CREATE TABLE PostLike (
    PostID INT NOT NULL,
    MemberID INT NOT NULL,
    PRIMARY KEY (PostID, MemberID),
    FOREIGN KEY (PostID) REFERENCES Post(PostID) ON DELETE CASCADE,
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Poll: Time-bounded polls created by any member.
-- ------------------------------------------------------------
CREATE TABLE Poll (
    PollID INT AUTO_INCREMENT PRIMARY KEY,
    CreatorID INT NOT NULL,
    Question TEXT NOT NULL,
    CreatedAt DATETIME NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    FOREIGN KEY (CreatorID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- PollOption: Answer choices belonging to a poll.
-- ------------------------------------------------------------
CREATE TABLE PollOption (
    OptionID INT AUTO_INCREMENT PRIMARY KEY,
    PollID INT NOT NULL,
    OptionText VARCHAR(200) NOT NULL,
    FOREIGN KEY (PollID) REFERENCES Poll(PollID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- PollVote: Records a member's vote on a specific poll option.
-- ------------------------------------------------------------
CREATE TABLE PollVote (
    OptionID INT NOT NULL,
    MemberID INT NOT NULL,
    PRIMARY KEY (OptionID, MemberID),
    FOREIGN KEY (OptionID) REFERENCES PollOption(OptionID) ON DELETE CASCADE,
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- JobPost: Job/internship listings posted by verified alumni.
-- ------------------------------------------------------------
CREATE TABLE JobPost (
    JobID INT AUTO_INCREMENT PRIMARY KEY,
    AlumniID INT NOT NULL,
    Title VARCHAR(200) NOT NULL,
    Company VARCHAR(100) NOT NULL,
    Description TEXT,
    ApplicationLink VARCHAR(500),
    PostedAt DATETIME NOT NULL,
    FOREIGN KEY (AlumniID) REFERENCES Alumni(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- ReferralRequest: Students requesting referrals from alumni.
-- ------------------------------------------------------------
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
);

-- ------------------------------------------------------------
-- ProfileClaimQuestion: Fun profile claims members can make about themselves.
-- ------------------------------------------------------------
CREATE TABLE ProfileClaimQuestion (
    ClaimID INT AUTO_INCREMENT PRIMARY KEY,
    MemberID INT NOT NULL,
    QuestionText TEXT NOT NULL,
    UserResponse TEXT NOT NULL,
    FOREIGN KEY (MemberID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- ProfileClaimVote: Other members agree/disagree with profile claims.
-- ------------------------------------------------------------
CREATE TABLE ProfileClaimVote (
    ClaimID INT NOT NULL,
    VoterID INT NOT NULL,
    IsAgree BOOLEAN NOT NULL,
    PRIMARY KEY (ClaimID, VoterID),
    FOREIGN KEY (ClaimID) REFERENCES ProfileClaimQuestion(ClaimID) ON DELETE CASCADE,
    FOREIGN KEY (VoterID) REFERENCES Member(MemberID) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- AuditLog: Tracks all data-modifying API requests and trigger-detected
-- direct DB modifications for security auditing.
-- ------------------------------------------------------------
CREATE TABLE AuditLog (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    Username VARCHAR(100),
    Action VARCHAR(50),
    Endpoint VARCHAR(200),
    IPAddress VARCHAR(50),
    Details TEXT,
    IsAuthorized BOOLEAN DEFAULT TRUE
);

-- ------------------------------------------------------------
-- OTPVerification: Stores one-time passwords for email verification
-- (used for password reset and username change).
-- ------------------------------------------------------------
CREATE TABLE OTPVerification (
    OTPID INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(200) NOT NULL,
    OTPCode VARCHAR(6) NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt DATETIME NOT NULL,
    Verified BOOLEAN DEFAULT FALSE
);
