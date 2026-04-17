import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'backend'))
from shard_db import query_shard
from shard_config import NUM_SHARDS

def run_verifications():
    print("--- 1. VERIFYING CORRECT PARTITIONING & DATA INTEGRITY ---")
    total_members = 0
    total_posts = 0
    
    # Track member IDs to ensure NO overlaps
    seen_members = set()
    overlaps = 0

    for shard_id in range(NUM_SHARDS):
        # Fetching members
        members = query_shard(shard_id, "SELECT MemberID FROM Member")
        for m in members:
            mid = m['MemberID']
            if mid in seen_members:
                overlaps += 1
            seen_members.add(mid)
            
            # Router correctness check directly against data
            expected_shard = mid % NUM_SHARDS
            if expected_shard != shard_id:
                print(f"ROUTING ERROR: Member {mid} found in Shard {shard_id} but expected in {expected_shard}")
                
        shard_member_count = len(members)
        total_members += shard_member_count
        
        # Fetching posts
        posts = query_shard(shard_id, "SELECT PostID, AuthorID FROM Post")
        shard_post_count = len(posts)
        total_posts += shard_post_count
        
        print(f"Shard {shard_id}: contains {shard_member_count} Members and {shard_post_count} Posts.")

    print("\n--- RESULTS ---")
    print(f"Total Members Validated: {total_members} (Expected 50)")
    print(f"Total Posts Validated: {total_posts} (Expected 100)")
    print(f"Overlapping/Duplicate Members: {overlaps} (Expected 0)")
    print("Partitioning Integrity: SUCCESS" if overlaps == 0 and total_members == 50 else "Partitioning Integrity: FAILED")

    print("\n--- 2. VERIFYING ROUTER CORRECTNESS ---")
    print("Testing `MemberID = 42` Routing (42 % 3 = 0):")
    # Member 42 modulo 3 == 0. Should be in shard 0.
    s0 = query_shard(0, "SELECT MemberID FROM Member WHERE MemberID = 42")
    s1 = query_shard(1, "SELECT MemberID FROM Member WHERE MemberID = 42")
    s2 = query_shard(2, "SELECT MemberID FROM Member WHERE MemberID = 42")
    print(f"Shard 0 hit: {bool(s0)} | Shard 1 hit: {bool(s1)} | Shard 2 hit: {bool(s2)}")
    if bool(s0) and not bool(s1) and not bool(s2):
        print("Point-Lookup Routing: SUCCESS")
    else:
        print("Point-Lookup Routing: FAILED")


if __name__ == '__main__':
    run_verifications()
