-- =============================================================================
-- indexes.sql  --  Performance indexes for IITGN Connect (CS432 Module B)
-- =============================================================================
-- These indexes target the most frequently executed queries identified in the
-- Flask API route handlers.  Each index is annotated with the query pattern(s)
-- it accelerates.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Post table
-- ---------------------------------------------------------------------------

-- Posts are fetched by AuthorID in profile pages (WHERE p.AuthorID = %s)
-- and joined on AuthorID -> Member.MemberID in every post listing.
CREATE INDEX idx_post_authorid ON Post (AuthorID);

-- Group-specific post feeds filter on GroupID (WHERE p.GroupID = %s) and the
-- "groups" feed uses a subquery: WHERE p.GroupID IN (SELECT GroupID FROM ...).
CREATE INDEX idx_post_groupid ON Post (GroupID);

-- Almost every post listing sorts by CreatedAt DESC.  A composite index on
-- (GroupID, CreatedAt DESC) lets the group-posts query do an index-range scan
-- with built-in ordering, avoiding a filesort.
CREATE INDEX idx_post_groupid_createdat ON Post (GroupID, CreatedAt DESC);

-- The global feed orders by CreatedAt DESC without a WHERE on GroupID.
-- A standalone index on CreatedAt covers that ORDER BY.
CREATE INDEX idx_post_createdat ON Post (CreatedAt DESC);

-- Profile page: WHERE p.AuthorID = %s ORDER BY p.CreatedAt DESC LIMIT 10
CREATE INDEX idx_post_authorid_createdat ON Post (AuthorID, CreatedAt DESC);

-- ---------------------------------------------------------------------------
-- 2. Comment table
-- ---------------------------------------------------------------------------

-- Comments are loaded per post: WHERE c.PostID = %s ORDER BY c.CreatedAt ASC.
-- Composite index satisfies both the filter and the sort.
CREATE INDEX idx_comment_postid_createdat ON Comment (PostID, CreatedAt ASC);

-- Correlated subquery  (SELECT COUNT(*) FROM Comment WHERE PostID = p.PostID)
-- appears in every post listing.  The above composite index covers this too,
-- but a plain FK index on PostID is also useful for DELETE CASCADE lookups.
CREATE INDEX idx_comment_postid ON Comment (PostID);

-- Comment author joined to Member (JOIN Member m ON c.AuthorID = m.MemberID).
CREATE INDEX idx_comment_authorid ON Comment (AuthorID);

-- ---------------------------------------------------------------------------
-- 3. PostLike table
-- ---------------------------------------------------------------------------

-- PostLike already has a composite PK (PostID, MemberID) which covers:
--   - COUNT(*) ... WHERE PostID = p.PostID        (leading column)
--   - SELECT ... WHERE PostID = %s AND MemberID = %s
-- We add a reverse index for the "liked posts by user" query:
--   SELECT PostID FROM PostLike WHERE MemberID = %s
CREATE INDEX idx_postlike_memberid ON PostLike (MemberID);

-- ---------------------------------------------------------------------------
-- 4. GroupMembership table
-- ---------------------------------------------------------------------------

-- GroupMembership PK is (GroupID, MemberID) which covers:
--   - WHERE GroupID = %s  (member list per group, member count subquery)
-- We need a reverse index for:
--   SELECT GroupID FROM GroupMembership WHERE MemberID = %s
--   (user's groups in profile page and "groups" feed subquery)
CREATE INDEX idx_groupmembership_memberid ON GroupMembership (MemberID);

-- ---------------------------------------------------------------------------
-- 5. CampusGroup table
-- ---------------------------------------------------------------------------

-- Groups are joined on AdminID -> Member.MemberID in group listings.
CREATE INDEX idx_campusgroup_adminid ON CampusGroup (AdminID);

-- ---------------------------------------------------------------------------
-- 6. Member table  (Username & Email lookups)
-- ---------------------------------------------------------------------------

-- Login: WHERE Username = %s  (already has UNIQUE constraint which creates an
-- index, but we document it here for completeness).
-- Registration duplicate check: WHERE Username = %s OR Email = %s
-- Both Username and Email have UNIQUE constraints, so MySQL already maintains
-- B-tree indexes on them.  No additional index needed.

-- Member search in members route:  WHERE Name LIKE %s OR Username LIKE %s
-- LIKE with a leading wildcard ('%search%') cannot use a B-tree index for
-- range scans, but an index on Name still helps if the optimiser can do an
-- index scan instead of a full table scan, and it accelerates ORDER BY Name.
CREATE INDEX idx_member_name ON Member (Name);

-- MemberType filter: WHERE MemberType = %s (members search with type filter).
CREATE INDEX idx_member_membertype ON Member (MemberType);

-- ---------------------------------------------------------------------------
-- 7. Poll / PollOption / PollVote tables
-- ---------------------------------------------------------------------------

-- Poll listing: ORDER BY p.CreatedAt DESC, JOIN on CreatorID.
CREATE INDEX idx_poll_createdat ON Poll (CreatedAt DESC);
CREATE INDEX idx_poll_creatorid ON Poll (CreatorID);

-- PollOption lookup: WHERE po.PollID = %s ORDER BY po.OptionID
CREATE INDEX idx_polloption_pollid ON PollOption (PollID);

-- PollVote count: (SELECT COUNT(*) FROM PollVote WHERE OptionID = po.OptionID)
-- PollVote PK is (OptionID, MemberID) which already covers this.
-- User vote check needs: WHERE po.PollID = %s AND pv.MemberID = %s
-- joined through PollOption.  An index on PollVote.MemberID helps the join.
CREATE INDEX idx_pollvote_memberid ON PollVote (MemberID);

-- ---------------------------------------------------------------------------
-- 8. JobPost table
-- ---------------------------------------------------------------------------

-- Job listing: ORDER BY j.PostedAt DESC, JOIN on AlumniID.
CREATE INDEX idx_jobpost_postedat ON JobPost (PostedAt DESC);
CREATE INDEX idx_jobpost_alumniid ON JobPost (AlumniID);

-- ---------------------------------------------------------------------------
-- 9. ReferralRequest table
-- ---------------------------------------------------------------------------

-- Alumni view: WHERE r.TargetAlumniID = %s ORDER BY r.RequestedAt DESC
CREATE INDEX idx_referral_targetalumniid_requestedat ON ReferralRequest (TargetAlumniID, RequestedAt DESC);

-- Student view: WHERE r.StudentID = %s ORDER BY r.RequestedAt DESC
CREATE INDEX idx_referral_studentid_requestedat ON ReferralRequest (StudentID, RequestedAt DESC);

-- ---------------------------------------------------------------------------
-- 10. ClassAttendance table
-- ---------------------------------------------------------------------------

-- Class attendance query: WHERE ca.StudentID = %s AND MONTH(...) AND YEAR(...)
-- ORDER BY ca.RecordDate.
-- The MONTH/YEAR functions prevent direct index range scans on RecordDate, but
-- a composite index on (StudentID, RecordDate) still narrows the scan to that
-- student's rows and keeps them ordered by date.
CREATE INDEX idx_classattendance_studentid_date ON ClassAttendance (StudentID, RecordDate);

-- Streak query: WHERE StudentID = %s ORDER BY RecordDate DESC
-- The above composite index covers this (backward scan).

-- Join on CourseID for attendance detail view.
CREATE INDEX idx_classattendance_courseid ON ClassAttendance (CourseID);

-- ---------------------------------------------------------------------------
-- 11. MessAttendance table
-- ---------------------------------------------------------------------------

-- Mess attendance: WHERE StudentID = %s AND MONTH(...) AND YEAR(...)
-- ORDER BY RecordDate.  Same rationale as ClassAttendance.
CREATE INDEX idx_messattendance_studentid_date ON MessAttendance (StudentID, RecordDate);

-- ---------------------------------------------------------------------------
-- 12. ProfileClaimQuestion / ProfileClaimVote tables
-- ---------------------------------------------------------------------------

-- Claims per member: WHERE pcq.MemberID = %s ORDER BY pcq.ClaimID
CREATE INDEX idx_profileclaim_memberid ON ProfileClaimQuestion (MemberID);

-- Vote counts use PK (ClaimID, VoterID) which covers WHERE ClaimID = ...
-- Reverse lookup for voter: WHERE ClaimID = %s AND VoterID = %s is also
-- covered by the PK.  No additional index needed.

-- ---------------------------------------------------------------------------
-- 13. Enrollment table
-- ---------------------------------------------------------------------------

-- Enrollment PK is (StudentID, CourseID, Semester).  CourseID lookups for
-- course detail / CASCADE deletes benefit from a separate index.
CREATE INDEX idx_enrollment_courseid ON Enrollment (CourseID);
