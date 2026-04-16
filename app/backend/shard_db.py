"""
shard_db.py — Connection configuration and logical routing pool for shards.
"""

import mysql.connector
from shard_config import SHARDS, NUM_SHARDS

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
