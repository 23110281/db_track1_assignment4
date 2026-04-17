import mysql.connector
import config
from shard_db import NUM_SHARDS, query_shard, query_all_shards, execute_shard, execute_all_shards, get_shard_for_member, insert_replicated_row
from shard_config import SHARD_KEY_MAP, REPLICATED_TABLES
import re

LOCAL_TABLES = ["AuditLog", "OTPVerification"]

def get_db():
    return mysql.connector.connect(
        host=config.MYSQL_HOST,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DB,
    )

def _get_table(sql):
    m = re.search(r'\b(?:FROM|INTO|UPDATE|DELETE\s+FROM)\s+`?([a-zA-Z0-9_]+)`?', sql, re.IGNORECASE)
    if m:
        table = m.group(1)
        # Handle implicit aliases
        if table.upper() in ["MEMBER", "POST", "COMMENT", "CAMPUSGROUP", "GROUPMEMBERSHIP", "POLL", "POLLOPTION", "POLLVOTE", "STUDENT", "PROFESSOR", "ALUMNI", "ORGANIZATION", "JOBPOST", "REFERRALREQUEST", "COURSE", "ENROLLMENT", "CLASSATTENDANCE", "MESSATTENDANCE", "PROFILECLAIMQUESTION", "PROFILECLAIMVOTE"]:
            for t in SHARD_KEY_MAP.keys():
                if t.upper() == table.upper(): return t
            for t in REPLICATED_TABLES:
                if t.upper() == table.upper(): return t
            return table
        return table
    return None

def query_db(sql, args=None, one=False):
    table = _get_table(sql)
    if not table or table in LOCAL_TABLES:
        conn = get_db()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql, args or ())
            rows = cursor.fetchall()
            cursor.close()
            if one:
                return rows[0] if rows else None
            return rows
        finally:
            try: conn.close()
            except: pass
            
    # Route to shards
    rows = query_all_shards(sql, args)
    
    # Heuristics for ORDER BY locally since fan-out concatenation isn't ordered
    if 'ORDER BY' in sql.upper() and 'DESC' in sql.upper() and 'CreatedAt' in sql:
        try:
            rows.sort(key=lambda x: str(x['CreatedAt']), reverse=True)
        except:
            pass
    
    if one:
        return rows[0] if rows else None
    return rows

def _set_audit_session_vars(cursor):
    """Set MySQL session variables so triggers can identify API-based operations."""
    try:
        from flask import request as flask_request, has_request_context, g
        from flask_jwt_extended import get_jwt_identity
        if has_request_context():
            username = 'anonymous'
            try:
                uid = get_jwt_identity()
                if uid:
                    if hasattr(g, '_audit_username'):
                        username = g._audit_username
                    else:
                        rows = query_all_shards("SELECT Username FROM Member WHERE MemberID = %s", (int(uid),))
                        if rows:
                            username = rows[0]['Username']
                        g._audit_username = username
            except Exception:
                pass
            cursor.execute("SET @app_username = %s", (username,))
            cursor.execute("SET @app_endpoint = %s", (flask_request.path,))
            cursor.execute("SET @app_ip = %s", (flask_request.remote_addr or '127.0.0.1',))
    except Exception:
        pass


def execute_db(sql, args=None):
    table = _get_table(sql)
    
    if not table or table in LOCAL_TABLES:
        conn = get_db()
        try:
            cursor = conn.cursor(buffered=True)
            _set_audit_session_vars(cursor)
            cursor.execute(sql, args or ())
            conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            return last_id
        finally:
            try: conn.close()
            except: pass

    is_insert = "INSERT" in sql.upper()

    if is_insert and table in REPLICATED_TABLES:
        return insert_replicated_row(sql, args)

    if is_insert and table in SHARD_KEY_MAP:
        shard_col = SHARD_KEY_MAP[table]
        # Parse standard INSERT INTO Table (Col1, Col2) VALUES (%s, %s)
        cols_match = re.search(r'\((.*?)\)', sql)
        if cols_match:
            cols = [c.strip() for c in cols_match.group(1).split(',')]
            try:
                idx = cols.index(shard_col)
                shard_key_val = args[idx]
                shard_id = get_shard_for_member(shard_key_val)
                return execute_shard(shard_id, sql, args)
            except ValueError:
                # Fallback to broadcasting
                pass
    
    if table in REPLICATED_TABLES:
        execute_all_shards(sql, args)
        return 0

    raise RuntimeError(
        f"execute_db refused write on sharded table '{table}'. "
        "Use explicit route-level shard routing with execute_shard/execute_all_shards."
    )

def execute_transaction(statements):
    """Execute multiple SQL statements sequentially across all shards."""
    # Since transaction logic across multiple shards is true distributed transaction (2PC),
    # we simulate it by just running on all shards individually.
    for sql, args in statements:
        execute_db(sql, args)
    return 0
