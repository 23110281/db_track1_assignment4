"""
shard_db.py — Connection configuration and logical routing pool for shards.
"""

import mysql.connector
import re
from shard_config import SHARDS, NUM_SHARDS

LOCAL_TABLES = {"AuditLog", "OTPVerification"}
ALL_TABLES = {
    "ProfileClaimVote", "ProfileClaimQuestion", "ReferralRequest", "JobPost",
    "PollVote", "PollOption", "Poll", "PostLike", "Comment", "Post",
    "GroupMembership", "CampusGroup", "MessAttendance", "ClassAttendance",
    "Enrollment", "Course", "Organization", "Alumni", "Professor", "Student", "Member"
}

REPLICATED_ID_COLUMNS = {
    "Course": "CourseID",
    "CampusGroup": "GroupID",
    "Enrollment": None,
    "JobPost": "JobID",
    "PollOption": "OptionID",
    "Poll": "PollID",
}

def rewrite_sql_for_shard(sql: str, shard_id: int) -> str:
    """Dynamically rewrites SQL to use the appropriate prefix for simulated shard isolation."""
    for table in ALL_TABLES:
        # Match table name only if preceded by FROM, JOIN, INTO, UPDATE, TABLE
        pattern = r'(?i)\b(FROM|JOIN|INTO|UPDATE|TABLE)\s+`?(' + table + r')`?\b'
        sql = re.sub(pattern, f"\\1 `shard_{shard_id}_{table}`", sql)
    return sql

def get_shard_conn(shard_id: int):
    cfg = SHARDS[shard_id % NUM_SHARDS]
    return mysql.connector.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
        connection_timeout=10,
    )

def get_shard_for_member(member_id: int) -> int:
    return int(member_id) % NUM_SHARDS

def query_shard(shard_id: int, sql: str, args=None, one: bool = False):
    conn = get_shard_conn(shard_id)
    try:
        cur = conn.cursor(dictionary=True)
        sql = rewrite_sql_for_shard(sql, shard_id)
        cur.execute(sql, args or ())
        rows = cur.fetchall()
        cur.close()
        if one:
            return rows[0] if rows else None
        return rows
    except Exception as e:
        print(f"[Query Error - Shard {shard_id}]: {e}")
        return None if one else []
    finally:
        try:
            conn.close()
        except: pass

def query_all_shards(sql: str, args=None):
    results = []
    for shard_id in range(NUM_SHARDS):
        try:
            rows = query_shard(shard_id, sql, args)
            results.extend(rows)
        except Exception as e:
            print(f"[Shard {shard_id} Unavailable]: {e}")
    return results

def execute_shard(shard_id: int, sql: str, args=None):
    conn = get_shard_conn(shard_id)
    try:
        cur = conn.cursor(buffered=True)
        sql = rewrite_sql_for_shard(sql, shard_id)
        cur.execute(sql, args or ())
        conn.commit()
        last_id = cur.lastrowid
        cur.close()
        return last_id
    finally:
        try:
            conn.close()
        except: pass

def execute_all_shards(sql: str, args=None):
    for shard_id in range(NUM_SHARDS):
        try:
            execute_shard(shard_id, sql, args)
        except Exception as e:
            print(f"[Execute Error - Shard {shard_id}]: {e}")


def _parse_insert_table_and_columns(sql: str):
    """Parse a simple INSERT statement and return (table_name, [columns])."""
    match = re.search(
        r'(?is)^\s*INSERT\s+INTO\s+`?([A-Za-z0-9_]+)`?\s*\(([^)]*)\)\s*VALUES\s*\(',
        sql,
    )
    if not match:
        return None, None
    table = match.group(1)
    columns = [c.strip().strip("`") for c in match.group(2).split(",") if c.strip()]
    return table, columns


def _inject_generated_id(sql: str, args: tuple, id_column: str, generated_id: int):
    """Return SQL/args that include generated PK in INSERT column and values lists."""
    # Insert ID column first in column list.
    sql_with_col = re.sub(
        r'(?is)^\s*(INSERT\s+INTO\s+`?[A-Za-z0-9_]+`?\s*\()',
        r'\1`' + id_column + r'`, ',
        sql,
        count=1,
    )
    # Insert corresponding placeholder first in VALUES list.
    sql_with_placeholder = re.sub(
        r'(?is)(VALUES\s*\()',
        r'\1%s, ',
        sql_with_col,
        count=1,
    )
    return sql_with_placeholder, (generated_id,) + tuple(args or ())


def insert_replicated_row(sql: str, args=None, canonical_shard: int = 0):
    """
    Insert into a replicated table once, then replay on other shards with same primary key.
    Returns the generated primary key (or 0 when table has no surrogate key).
    """
    table, columns = _parse_insert_table_and_columns(sql)
    if not table or table not in REPLICATED_ID_COLUMNS:
        raise ValueError("insert_replicated_row requires INSERT INTO a replicated table")

    id_column = REPLICATED_ID_COLUMNS[table]
    generated_id = execute_shard(canonical_shard, sql, args)

    for shard_id in range(NUM_SHARDS):
        if shard_id == canonical_shard:
            continue
        if id_column is None:
            execute_shard(shard_id, sql, args)
            continue

        if id_column in columns:
            execute_shard(shard_id, sql, args)
        else:
            replay_sql, replay_args = _inject_generated_id(sql, tuple(args or ()), id_column, generated_id)
            execute_shard(shard_id, replay_sql, replay_args)

    return generated_id if generated_id is not None else 0

