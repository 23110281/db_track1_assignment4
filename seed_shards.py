"""
seed_shards.py — Faker seeding for the 3 remote shards.
Generates 50 members and 100 posts, mapping inserts directly to shards via % 3 hash.
"""

import sys
import os
import random
from faker import Faker
from datetime import datetime, timedelta
import werkzeug.security

sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'backend'))
from shard_db import NUM_SHARDS, execute_shard, execute_all_shards, get_shard_for_member
from shard_router import route_insert

fake = Faker()
Faker.seed(432)
random.seed(432)


def generate_data():
    print("Seeding 50 members and distributing across 3 shards...")
    pw_hash = werkzeug.security.generate_password_hash("password123")
    
    member_types = ['Student', 'Professor', 'Alumni', 'Organization']
    
    for member_id in range(1, 51):
        username = f"user_{fake.user_name()}_{member_id}"
        m_type = random.choices(member_types, weights=[70, 10, 15, 5])[0]
        
        member_data = {
            "MemberID": member_id,
            "Username": username,
            "Name": fake.name(),
            "Email": f"{username}@iitgn.ac.in",
            "Password": pw_hash,
            "MemberType": m_type,
            "ContactNumber": fake.phone_number()[:15],
            "CreatedAt": fake.date_between(start_date='-2y', end_date='today').isoformat(),
            "AvatarColor": fake.hex_color(),
            "IsAdmin": 1 if member_id == 1 else 0,
        }
        
        # Route to exact shard
        shard_id = get_shard_for_member(member_id)
        route_insert("Member", member_data)
        
        # Insert subtype
        if m_type == 'Student':
            sub_data = {
                "MemberID": member_id,
                "Programme": random.choice(["B.Tech", "M.Tech", "PhD"]),
                "Branch": random.choice(["CS", "EE", "ME", "CE", "MSE"]),
                "CurrentYear": random.randint(1, 4),
                "MessAssignment": random.choice(["Mess A", "Mess B"]),
            }
            route_insert("Student", sub_data)
        elif m_type == 'Professor':
            sub_data = {
                "MemberID": member_id,
                "Designation": random.choice(["Assistant Professor", "Associate Professor", "Professor"]),
                "Department": random.choice(["CS", "EE", "Mathematics", "HSS"]),
                "JoiningDate": fake.date_between(start_date='-10y', end_date='-1y').isoformat(),
            }
            route_insert("Professor", sub_data)
        elif m_type == 'Alumni':
            sub_data = {
                "MemberID": member_id,
                "CurrentOrganization": fake.company(),
                "GraduationYear": random.randint(2015, 2025),
                "Verified": 1,
            }
            route_insert("Alumni", sub_data)
        elif m_type == 'Organization':
            sub_data = {
                "MemberID": member_id,
                "OrgType": random.choice(["Technical Club", "Cultural Club", "Sports Team", "Fest"]),
                "FoundationDate": fake.date_between(start_date='-5y', end_date='-1y').isoformat(),
                "ContactEmail": f"contact_{member_id}@iitgn.ac.in",
            }
            route_insert("Organization", sub_data)

    print("Members seeded.")

    # Campus groups (replicated)
    groups = []
    print("Seeding 5 Campus Groups (Replicated)...")
    for group_id in range(1, 6):
        admin_id = random.randint(1, 50)
        group_data = {
            "GroupID": group_id,
            "Name": f"{fake.word().capitalize()} Group",
            "Description": fake.sentence(),
            "AdminID": admin_id,
        }
        route_insert("CampusGroup", group_data)
        groups.append(group_id)

    # 100 Posts
    print("Seeding 100 Posts (Sharded by AuthorID)...")
    for post_id in range(1, 101):
        author_id = random.randint(1, 50)
        group_id = random.choice([None, None, random.choice(groups)]) # 2/3 global, 1/3 group
        
        post_data = {
            "PostID": post_id,
            "AuthorID": author_id,
            "GroupID": group_id,
            "Content": fake.paragraph(nb_sentences=3),
            "ImageURL": None,
            "CreatedAt": fake.date_time_between(start_date='-30d', end_date='now').strftime('%Y-%m-%d %H:%M:%S'),
        }
        route_insert("Post", post_data)

    print("Seeding Complete!")

if __name__ == "__main__":
    generate_data()
