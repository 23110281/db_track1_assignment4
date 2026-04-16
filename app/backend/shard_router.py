"""
shard_router.py — Core routing logic that maps Member(ID) -> Shard
"""

from shard_config import SHARD_KEY_MAP, REPLICATED_TABLES, NUM_SHARDS
from shard_db import (
    get_shard_for_member,
    execute_shard,
    execute_all_shards,
    query_shard,
    query_all_shards,
)

def route_insert(table: str, data: dict, member_id: int = None):
    """
    Route an INSERT to the correct shard based on member_id.
    If the table is replicated, insert to all shards.
    """
    if table in REPLICATED_TABLES:
        cols = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"
        args = tuple(data.values())
        execute_all_shards(sql, args)
        return

    if member_id is None:
        if SHARD_KEY_MAP.get(table) in data:
            member_id = data[SHARD_KEY_MAP[table]]
        else:
            raise ValueError(f"No shard key provided for {table}")

    shard_id = get_shard_for_member(member_id)
    cols = ", ".join(data.keys())
    placeholders = ", ".join(["%s"] * len(data))
    sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"
    args = tuple(data.values())
    return execute_shard(shard_id, sql, args)

def route_lookup(table: str, member_id: int, sql: str, args=None, one=False):
    """Route a SELECT lookup to the correct shard."""
    shard_id = get_shard_for_member(member_id)
    return query_shard(shard_id, sql, args, one=one)
