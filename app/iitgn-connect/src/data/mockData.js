// Mock data based on the IITGN Connect database schema

export const members = [
  { MemberID: 1, Username: 'laksh_jain', Name: 'Laksh Jain', Email: 'laksh.jain@iitgn.ac.in', MemberType: 'Student', ContactNumber: '9876543210', CreatedAt: '2025-08-15', avatarColor: '#4F46E5' },
  { MemberID: 2, Username: 'parthiv_p', Name: 'Parthiv Patel', Email: 'parthiv.patel@iitgn.ac.in', MemberType: 'Student', ContactNumber: '9876543211', CreatedAt: '2025-08-15', avatarColor: '#059669' },
  { MemberID: 3, Username: 'ridham_p', Name: 'Ridham Patel', Email: 'ridham.patel@iitgn.ac.in', MemberType: 'Student', ContactNumber: '9876543212', CreatedAt: '2025-08-15', avatarColor: '#DC2626' },
  { MemberID: 4, Username: 'rudra_s', Name: 'Rudra Singh', Email: 'rudra.singh@iitgn.ac.in', MemberType: 'Student', ContactNumber: '9876543213', CreatedAt: '2025-08-15', avatarColor: '#D97706' },
  { MemberID: 5, Username: 'shriniket_b', Name: 'Shriniket Behera', Email: 'shriniket.b@iitgn.ac.in', MemberType: 'Student', ContactNumber: '9876543214', CreatedAt: '2025-08-15', avatarColor: '#7C3AED' },
  { MemberID: 6, Username: 'prof_yogesh', Name: 'Dr. Yogesh K. Meena', Email: 'yogesh.meena@iitgn.ac.in', MemberType: 'Professor', ContactNumber: '9876543215', CreatedAt: '2020-01-10', avatarColor: '#0891B2' },
  { MemberID: 7, Username: 'prof_anirban', Name: 'Dr. Anirban Dasgupta', Email: 'anirban.d@iitgn.ac.in', MemberType: 'Professor', ContactNumber: '9876543216', CreatedAt: '2019-06-01', avatarColor: '#BE185D' },
  { MemberID: 8, Username: 'alumni_rahul', Name: 'Rahul Sharma', Email: 'rahul.sharma@alumni.iitgn.ac.in', MemberType: 'Alumni', ContactNumber: '9876543217', CreatedAt: '2018-05-20', avatarColor: '#65A30D' },
  { MemberID: 9, Username: 'alumni_priya', Name: 'Priya Verma', Email: 'priya.verma@alumni.iitgn.ac.in', MemberType: 'Alumni', ContactNumber: '9876543218', CreatedAt: '2019-05-20', avatarColor: '#EA580C' },
  { MemberID: 10, Username: 'techclub', Name: 'Technical Club IITGN', Email: 'techclub@iitgn.ac.in', MemberType: 'Organization', ContactNumber: '9876543219', CreatedAt: '2020-09-01', avatarColor: '#4338CA' },
  { MemberID: 11, Username: 'admin_user', Name: 'System Admin', Email: 'admin@iitgn.ac.in', MemberType: 'Student', ContactNumber: '9876543220', CreatedAt: '2025-01-01', avatarColor: '#991B1B', isAdmin: true },
];

export const students = [
  { MemberID: 1, Programme: 'B.Tech', Branch: 'Computer Science', CurrentYear: 3, MessAssignment: 'Mess A' },
  { MemberID: 2, Programme: 'B.Tech', Branch: 'Electrical Engineering', CurrentYear: 3, MessAssignment: 'Mess B' },
  { MemberID: 3, Programme: 'B.Tech', Branch: 'Mechanical Engineering', CurrentYear: 2, MessAssignment: 'Mess A' },
  { MemberID: 4, Programme: 'M.Tech', Branch: 'Artificial Intelligence', CurrentYear: 1, MessAssignment: 'Mess B' },
  { MemberID: 5, Programme: 'PhD', Branch: 'Computer Science', CurrentYear: 2, MessAssignment: 'Mess A' },
  { MemberID: 11, Programme: 'B.Tech', Branch: 'Computer Science', CurrentYear: 4, MessAssignment: 'Mess A' },
];

export const professors = [
  { MemberID: 6, Designation: 'Associate Professor', Department: 'Computer Science', JoiningDate: '2020-01-10' },
  { MemberID: 7, Designation: 'Professor', Department: 'Computer Science', JoiningDate: '2019-06-01' },
];

export const alumni = [
  { MemberID: 8, CurrentOrganization: 'Google', GraduationYear: 2022, Verified: true },
  { MemberID: 9, CurrentOrganization: 'Microsoft', GraduationYear: 2023, Verified: true },
];

export const organizations = [
  { MemberID: 10, OrgType: 'Technical Club', FoundationDate: '2020-09-01', ContactEmail: 'techclub@iitgn.ac.in' },
];

export const courses = [
  { CourseID: 1, CourseCode: 'CS432', CourseName: 'Databases', CourseSlot: 'A', ProfessorID: 6 },
  { CourseID: 2, CourseCode: 'CS301', CourseName: 'Algorithms', CourseSlot: 'B', ProfessorID: 7 },
  { CourseID: 3, CourseCode: 'CS201', CourseName: 'Data Structures', CourseSlot: 'C', ProfessorID: 6 },
  { CourseID: 4, CourseCode: 'MA201', CourseName: 'Linear Algebra', CourseSlot: 'D', ProfessorID: 7 },
];

export const enrollments = [
  { StudentID: 1, CourseID: 1, EnrollmentDate: '2026-01-10', Semester: 'Spring 2026', Status: 'Active' },
  { StudentID: 1, CourseID: 2, EnrollmentDate: '2026-01-10', Semester: 'Spring 2026', Status: 'Active' },
  { StudentID: 2, CourseID: 1, EnrollmentDate: '2026-01-10', Semester: 'Spring 2026', Status: 'Active' },
  { StudentID: 2, CourseID: 3, EnrollmentDate: '2026-01-10', Semester: 'Spring 2026', Status: 'Active' },
  { StudentID: 3, CourseID: 2, EnrollmentDate: '2026-01-10', Semester: 'Spring 2026', Status: 'Active' },
  { StudentID: 3, CourseID: 4, EnrollmentDate: '2026-01-10', Semester: 'Spring 2026', Status: 'Active' },
];

const generateAttendance = () => {
  const records = [];
  let id = 1;
  const statuses = ['Present', 'Present', 'Present', 'Present', 'Absent'];
  for (let sid = 1; sid <= 5; sid++) {
    for (let day = 1; day <= 20; day++) {
      const date = `2026-03-${String(day).padStart(2, '0')}`;
      records.push({
        AttendanceID: id++,
        CourseID: (sid % 4) + 1,
        StudentID: sid,
        RecordDate: date,
        Status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
  }
  return records;
};
export const classAttendance = generateAttendance();

const generateMessAttendance = () => {
  const records = [];
  let id = 1;
  const meals = ['Breakfast', 'Lunch', 'Dinner'];
  const statuses = ['Eaten', 'Eaten', 'Eaten', 'Missed'];
  for (let sid = 1; sid <= 5; sid++) {
    for (let day = 1; day <= 20; day++) {
      for (const meal of meals) {
        records.push({
          MessRecordID: id++,
          StudentID: sid,
          RecordDate: `2026-03-${String(day).padStart(2, '0')}`,
          MealType: meal,
          Status: statuses[Math.floor(Math.random() * statuses.length)],
        });
      }
    }
  }
  return records;
};
export const messAttendance = generateMessAttendance();

export const campusGroups = [
  { GroupID: 1, Name: 'CS Batch 2023', Description: 'Computer Science batch of 2023 discussion group', AdminID: 1 },
  { GroupID: 2, Name: 'Coding Club', Description: 'Competitive programming and hackathons', AdminID: 10 },
  { GroupID: 3, Name: 'Photography Club', Description: 'Capture the beautiful campus life', AdminID: 3 },
  { GroupID: 4, Name: 'DB Project Group', Description: 'CS432 Database project collaboration - Group Chernaugh', AdminID: 1 },
  { GroupID: 5, Name: 'Placement Prep 2026', Description: 'Resources and tips for campus placements', AdminID: 2 },
];

export const groupMemberships = [
  { GroupID: 1, MemberID: 1, Role: 'Admin', JoinedAt: '2025-08-15' },
  { GroupID: 1, MemberID: 2, Role: 'Member', JoinedAt: '2025-08-16' },
  { GroupID: 1, MemberID: 3, Role: 'Member', JoinedAt: '2025-08-17' },
  { GroupID: 2, MemberID: 1, Role: 'Member', JoinedAt: '2025-09-01' },
  { GroupID: 2, MemberID: 10, Role: 'Admin', JoinedAt: '2025-09-01' },
  { GroupID: 2, MemberID: 5, Role: 'Moderator', JoinedAt: '2025-09-02' },
  { GroupID: 4, MemberID: 1, Role: 'Admin', JoinedAt: '2026-02-01' },
  { GroupID: 4, MemberID: 2, Role: 'Member', JoinedAt: '2026-02-01' },
  { GroupID: 4, MemberID: 3, Role: 'Member', JoinedAt: '2026-02-01' },
  { GroupID: 4, MemberID: 4, Role: 'Member', JoinedAt: '2026-02-01' },
  { GroupID: 4, MemberID: 5, Role: 'Member', JoinedAt: '2026-02-01' },
  { GroupID: 5, MemberID: 2, Role: 'Admin', JoinedAt: '2026-01-15' },
  { GroupID: 5, MemberID: 1, Role: 'Member', JoinedAt: '2026-01-16' },
];

export const posts = [
  { PostID: 1, AuthorID: 1, GroupID: null, Content: 'Just finished implementing the B+ Tree for our CS432 assignment! The node splitting logic was tricky but finally got it working. Happy to help anyone stuck on it.', ImageURL: null, CreatedAt: '2026-03-15T14:30:00', likes: 12, commentCount: 3 },
  { PostID: 2, AuthorID: 6, GroupID: null, Content: 'Reminder: CS432 Assignment 2 deadline is March 22nd, 6:00 PM. Make sure both Module A and Module B are complete. No extensions will be given.', ImageURL: null, CreatedAt: '2026-03-14T10:00:00', likes: 45, commentCount: 8 },
  { PostID: 3, AuthorID: 10, GroupID: 2, Content: 'Coding Club is organizing a hackathon next weekend! Theme: Campus Solutions. Teams of 3-4. Register by Friday. Prizes worth Rs. 50,000!', ImageURL: null, CreatedAt: '2026-03-13T16:45:00', likes: 78, commentCount: 15 },
  { PostID: 4, AuthorID: 3, GroupID: null, Content: 'The sunset from the library terrace today was absolutely stunning! IITGN campus never disappoints. 🌅', ImageURL: null, CreatedAt: '2026-03-13T18:30:00', likes: 34, commentCount: 5 },
  { PostID: 5, AuthorID: 8, GroupID: null, Content: 'Excited to share that Google is hiring for SDE-2 positions! If you\'re from IITGN, I can refer you. Check the job postings section for details.', ImageURL: null, CreatedAt: '2026-03-12T11:00:00', likes: 92, commentCount: 22 },
  { PostID: 6, AuthorID: 2, GroupID: 4, Content: 'Team, I\'ve pushed the ER diagram to the repo. Please review and suggest changes before tomorrow\'s meeting.', ImageURL: null, CreatedAt: '2026-03-11T20:15:00', likes: 5, commentCount: 4 },
  { PostID: 7, AuthorID: 7, GroupID: null, Content: 'Office hours for Algorithms (CS301) have been moved to Wednesday 3-5 PM this week due to faculty meeting on Monday.', ImageURL: null, CreatedAt: '2026-03-10T09:00:00', likes: 23, commentCount: 2 },
  { PostID: 8, AuthorID: 5, GroupID: 1, Content: 'Anyone up for a study session at the library tonight? Working on the databases assignment and could use some company.', ImageURL: null, CreatedAt: '2026-03-10T17:00:00', likes: 8, commentCount: 6 },
];

export const comments = [
  { CommentID: 1, PostID: 1, AuthorID: 2, Content: 'Great job! Can you share some tips on handling the merge operation?', CreatedAt: '2026-03-15T15:00:00' },
  { CommentID: 2, PostID: 1, AuthorID: 4, Content: 'Same here, the deletion part is really confusing me.', CreatedAt: '2026-03-15T15:30:00' },
  { CommentID: 3, PostID: 1, AuthorID: 1, Content: 'Sure! I\'ll write a summary and share it in the DB Project group.', CreatedAt: '2026-03-15T16:00:00' },
  { CommentID: 4, PostID: 2, AuthorID: 1, Content: 'Thank you for the reminder, Professor!', CreatedAt: '2026-03-14T10:30:00' },
  { CommentID: 5, PostID: 2, AuthorID: 3, Content: 'Will the submission be through GitHub only?', CreatedAt: '2026-03-14T11:00:00' },
  { CommentID: 6, PostID: 3, AuthorID: 1, Content: 'Count me in! Looking for teammates.', CreatedAt: '2026-03-13T17:00:00' },
  { CommentID: 7, PostID: 5, AuthorID: 1, Content: 'Thanks Rahul bhaiya! Just submitted my referral request.', CreatedAt: '2026-03-12T12:00:00' },
];

export const postLikes = [
  { PostID: 1, MemberID: 2 }, { PostID: 1, MemberID: 3 }, { PostID: 1, MemberID: 6 },
  { PostID: 2, MemberID: 1 }, { PostID: 2, MemberID: 2 }, { PostID: 2, MemberID: 3 },
  { PostID: 3, MemberID: 1 }, { PostID: 3, MemberID: 2 },
  { PostID: 5, MemberID: 1 }, { PostID: 5, MemberID: 2 }, { PostID: 5, MemberID: 3 },
];

export const polls = [
  { PollID: 1, CreatorID: 6, Question: 'Which day works best for the CS432 extra lecture?', CreatedAt: '2026-03-14T08:00:00', ExpiresAt: '2026-03-18T23:59:00' },
  { PollID: 2, CreatorID: 10, Question: 'What theme should the next hackathon have?', CreatedAt: '2026-03-13T12:00:00', ExpiresAt: '2026-03-20T23:59:00' },
  { PollID: 3, CreatorID: 1, Question: 'Best mess food this week?', CreatedAt: '2026-03-12T19:00:00', ExpiresAt: '2026-03-16T23:59:00' },
];

export const pollOptions = [
  { OptionID: 1, PollID: 1, OptionText: 'Saturday Morning', votes: 25 },
  { OptionID: 2, PollID: 1, OptionText: 'Saturday Evening', votes: 42 },
  { OptionID: 3, PollID: 1, OptionText: 'Sunday Morning', votes: 18 },
  { OptionID: 4, PollID: 1, OptionText: 'Sunday Evening', votes: 31 },
  { OptionID: 5, PollID: 2, OptionText: 'EdTech', votes: 34 },
  { OptionID: 6, PollID: 2, OptionText: 'HealthTech', votes: 28 },
  { OptionID: 7, PollID: 2, OptionText: 'FinTech', votes: 45 },
  { OptionID: 8, PollID: 2, OptionText: 'Campus Solutions', votes: 52 },
  { OptionID: 9, PollID: 3, OptionText: 'Monday Paneer', votes: 67 },
  { OptionID: 10, PollID: 3, OptionText: 'Wednesday Biryani', votes: 89 },
  { OptionID: 11, PollID: 3, OptionText: 'Friday Chole Bhature', votes: 54 },
];

export const jobPosts = [
  { JobID: 1, AlumniID: 8, Title: 'Software Engineer - L4', Company: 'Google', ApplicationLink: 'https://careers.google.com', Description: 'Looking for strong problem solvers with experience in distributed systems. New grad and 1 YOE welcome.', PostedAt: '2026-03-12T10:00:00' },
  { JobID: 2, AlumniID: 9, Title: 'SDE Intern - Summer 2026', Company: 'Microsoft', ApplicationLink: 'https://careers.microsoft.com', Description: 'Summer internship opportunity in Azure Cloud team. Must be familiar with cloud computing concepts.', PostedAt: '2026-03-10T14:00:00' },
  { JobID: 3, AlumniID: 8, Title: 'ML Engineer', Company: 'Google DeepMind', ApplicationLink: 'https://deepmind.google', Description: 'Research-oriented ML role. PhD or strong research background preferred. Work on cutting-edge AI problems.', PostedAt: '2026-03-08T09:00:00' },
  { JobID: 4, AlumniID: 9, Title: 'Product Manager', Company: 'Microsoft', ApplicationLink: 'https://careers.microsoft.com', Description: 'PM role for Office 365 team. Technical background with good communication skills required.', PostedAt: '2026-03-05T16:00:00' },
];

export const referralRequests = [
  { RequestID: 1, StudentID: 1, TargetAlumniID: 8, TargetCompany: 'Google', TargetRole: 'Software Engineer', JobPostingURL: 'https://careers.google.com/jobs/1', Status: 'Approved', RequestedAt: '2026-03-12T12:00:00' },
  { RequestID: 2, StudentID: 2, TargetAlumniID: 8, TargetCompany: 'Google', TargetRole: 'ML Engineer', JobPostingURL: 'https://careers.google.com/jobs/2', Status: 'Pending', RequestedAt: '2026-03-13T10:00:00' },
  { RequestID: 3, StudentID: 3, TargetAlumniID: 9, TargetCompany: 'Microsoft', TargetRole: 'SDE Intern', JobPostingURL: 'https://careers.microsoft.com/jobs/1', Status: 'Pending', RequestedAt: '2026-03-14T15:00:00' },
  { RequestID: 4, StudentID: 1, TargetAlumniID: 9, TargetCompany: 'Microsoft', TargetRole: 'Product Manager', JobPostingURL: 'https://careers.microsoft.com/jobs/2', Status: 'Rejected', RequestedAt: '2026-03-11T08:00:00' },
];

export const profileClaimQuestions = [
  { ClaimID: 1, MemberID: 1, QuestionText: 'Is Laksh the best coder in the batch?', UserResponse: 'Of course! 😄' },
  { ClaimID: 2, MemberID: 1, QuestionText: 'Does Laksh help others with assignments?', UserResponse: 'Always happy to help!' },
  { ClaimID: 3, MemberID: 2, QuestionText: 'Is Parthiv the most punctual student?', UserResponse: 'I try my best!' },
  { ClaimID: 4, MemberID: 3, QuestionText: 'Is Ridham the best photographer on campus?', UserResponse: 'Photography is my passion!' },
];

export const profileClaimVotes = [
  { ClaimID: 1, VoterID: 2, IsAgree: true }, { ClaimID: 1, VoterID: 3, IsAgree: true },
  { ClaimID: 1, VoterID: 4, IsAgree: false }, { ClaimID: 1, VoterID: 5, IsAgree: true },
  { ClaimID: 2, VoterID: 2, IsAgree: true }, { ClaimID: 2, VoterID: 3, IsAgree: true },
  { ClaimID: 3, VoterID: 1, IsAgree: true }, { ClaimID: 3, VoterID: 4, IsAgree: false },
  { ClaimID: 4, VoterID: 1, IsAgree: true }, { ClaimID: 4, VoterID: 2, IsAgree: true },
];

// Helper to get member by ID
export const getMember = (id) => members.find(m => m.MemberID === id);

// Helper to compute streaks
export const computeClassStreak = (studentId) => {
  const records = classAttendance
    .filter(r => r.StudentID === studentId)
    .sort((a, b) => b.RecordDate.localeCompare(a.RecordDate));
  let streak = 0;
  for (const r of records) {
    if (r.Status === 'Present') streak++;
    else break;
  }
  return streak;
};

export const computeMessStreak = (studentId) => {
  const records = messAttendance
    .filter(r => r.StudentID === studentId)
    .sort((a, b) => b.RecordDate.localeCompare(a.RecordDate));
  let streak = 0;
  for (const r of records) {
    if (r.Status === 'Eaten') streak++;
    else break;
  }
  return streak;
};
