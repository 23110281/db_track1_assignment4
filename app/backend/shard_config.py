"""
Shard Configuration — Team Chernaugh
CS 432 Databases — Assignment 4
Remote shards hosted at 10.0.116.184 (IITGN network only)
"""

SHARDS = [
    {   # Shard 0  (MemberID % 3 == 0)
        "host":     "10.0.116.184",
        "port":     3307,
        "user":     "Chernaugh",
        "password": "password@123",
        "database": "Chernaugh",
    },
    {   # Shard 1  (MemberID % 3 == 1)
        "host":     "10.0.116.184",
        "port":     3308,
        "user":     "Chernaugh",
        "password": "password@123",
        "database": "Chernaugh",
    },
    {   # Shard 2  (MemberID % 3 == 2)
        "host":     "10.0.116.184",
        "port":     3309,
        "user":     "Chernaugh",
        "password": "password@123",
        "database": "Chernaugh",
    },
]

NUM_SHARDS = len(SHARDS)

SHARD_KEY_MAP = {
    "Member":               "MemberID",
    "Student":              "MemberID",
    "Professor":            "MemberID",
    "Alumni":               "MemberID",
    "Organization":         "MemberID",
    "Post":                 "AuthorID",
    "Comment":              "AuthorID",
    "PostLike":             "MemberID",
    "GroupMembership":      "MemberID",
    "ClassAttendance":      "StudentID",
    "MessAttendance":       "StudentID",
    "ReferralRequest":      "StudentID",
    "ProfileClaimQuestion": "MemberID",
    "ProfileClaimVote":     "VoterID",
    "Poll":                 "CreatorID",
    "PollVote":             "MemberID",
}

REPLICATED_TABLES = [
    "Course",
    "CampusGroup",
    "Enrollment",
    "JobPost",
    "PollOption",
]
