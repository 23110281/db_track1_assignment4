"""
setup_shards.py — Clean slate deployment to remote shards.
Reads local app/sql/schema.sql, strips out foreign keys, and builds tables on 3 external shards with shard prefixes.
"""

import sys
import os
import re

sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'backend'))
from shard_db import execute_all_shards, NUM_SHARDS, execute_shard

def read_schema():
    schema_path = os.path.join(os.path.dirname(__file__), 'sql', '00_schema.sql')
    with open(schema_path, 'r') as f:
        sql_content = f.read()

    statements = re.findall(r'CREATE TABLE.*?\;', sql_content, re.IGNORECASE | re.DOTALL)
    return statements

def clean_statement(stmt):
    """Strip FOREIGN KEY lines out of a CREATE TABLE statement."""
    lines = stmt.split('\n')
    clean_lines = []
    
    for idx, line in enumerate(lines):
        if "FOREIGN KEY" in line:
            continue
        clean_lines.append(line)

    for i in range(len(clean_lines)):
        if clean_lines[i].strip() == ');':
            for j in range(i-1, -1, -1):
                if clean_lines[j].strip():
                    clean_lines[j] = clean_lines[j].rstrip(', \t\n\r')
                    break
    
    return '\n'.join(clean_lines)

def setup():
    tables_to_drop = [
        "AuditLog", "OTPVerification", 
        "ProfileClaimVote", "ProfileClaimQuestion", "ReferralRequest", "JobPost",
        "PollVote", "PollOption", "Poll", "PostLike", "Comment", "Post",
        "GroupMembership", "CampusGroup", "MessAttendance", "ClassAttendance",
        "Enrollment", "Course", "Organization", "Alumni", "Professor", "Student", "Member"
    ]
    
    for s in range(NUM_SHARDS):
        execute_shard(s, "SET FOREIGN_KEY_CHECKS = 0")
        for t in tables_to_drop:
            try:
                execute_shard(s, f"DROP TABLE IF EXISTS shard_{s}_{t}")
                execute_shard(s, f"DROP TABLE IF EXISTS {t}") # clean up old non-prefixed
            except: pass

    statements = read_schema()
    print(f"Found {len(statements)} CREATE statements.")
    
    for stmt in statements:
        if "CREATE TABLE AuditLog" in stmt or "CREATE TABLE OTPVerification" in stmt:
            continue
        
        c_stmt = clean_statement(stmt)
        t_match = re.search(r'CREATE TABLE\s+(`?\w+`?)', c_stmt, re.IGNORECASE)
        t_name = t_match.group(1).replace('`', '') if t_match else "UNKNOWN"
        print(f"Deploying table {t_name} to shards with prefixed naming...")
        
        for s in range(NUM_SHARDS):
            # Replace table name with prefixed table name `shard_s_t_name`
            prefixed_stmt = re.sub(r'CREATE TABLE\s+`?\w+`?', f'CREATE TABLE `shard_{s}_{t_name}`', c_stmt, 1, flags=re.IGNORECASE)
            execute_shard(s, prefixed_stmt)

    for s in range(NUM_SHARDS):
        execute_shard(s, "SET FOREIGN_KEY_CHECKS = 1")

if __name__ == "__main__":
    if input("DANGER: This drops and recreates schema on all 3 REMOTE SHARDS. Continue? [y/N]: ").lower() != 'y':
        sys.exit()
    setup()
    print("Schema deployed to remote shards!")
