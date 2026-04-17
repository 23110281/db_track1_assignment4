import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'backend'))
from shard_db import query_shard, query_all_shards
from shard_config import NUM_SHARDS

def run_tests():
    print("--- DEMONSTRATING ROUTING CORRECTNESS (Point Query) ---")
    member_id = 42
    print(f"Target MemberID: {member_id}. Expected Shard (42 % 3): {member_id % NUM_SHARDS}")
    
    for i in range(NUM_SHARDS):
        res = query_shard(i, f"SELECT Username FROM Member WHERE MemberID = {member_id}")
        hit = "FOUND" if res else "Not found"
        print(f"Executing query on Shard {i}: {hit}")
    
    print("\n--- DEMONSTRATING RANGE QUERY SPANNING SHARDS ---")
    print("Query: Fetch the latest 5 posts globally (No Shard Key)")
    sql = "SELECT PostID, AuthorID FROM Post ORDER BY PostID DESC LIMIT 5"
    
    # We use query_all_shards to fetch from ALL 3 shards as a range scan
    results = query_all_shards(sql)
    
    # In Application Logic, we aggregate them and sort manually
    results.sort(key=lambda x: x['PostID'], reverse=True)
    top_5 = results[:5]
    
    print("Gathered results combined across all shards:")
    for post in top_5:
        expected_shard = post['AuthorID'] % 3
        print(f"   => PostID: {post['PostID']}, AuthorID: {post['AuthorID']} (Sourced dynamically from Shard {expected_shard})")


if __name__ == '__main__':
    run_tests()
