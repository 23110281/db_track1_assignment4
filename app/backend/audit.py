"""
Audit logging module for IITGN Connect.
Provides file-based and database-based audit logging for all data-modifying operations.
"""

import logging
import os
from datetime import datetime
from db import execute_db

# --- File-based audit logger setup ---
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'audit.log')

audit_logger = logging.getLogger('audit')
audit_logger.setLevel(logging.INFO)
audit_logger.propagate = False

# Avoid adding duplicate handlers on re-import
if not audit_logger.handlers:
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] [USER:%(user)s] [ACTION:%(action)s] '
        '[ENDPOINT:%(endpoint)s] [IP:%(ip)s] — %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    file_handler.setFormatter(formatter)
    audit_logger.addHandler(file_handler)


def log_action(action, details, user=None):
    """
    Log an audit event to the audit.log file.
    Should be called from within a Flask request context.
    """
    from flask import request as flask_request

    try:
        username = user or 'anonymous'
        endpoint = flask_request.path if flask_request else 'N/A'
        ip = flask_request.remote_addr if flask_request else 'N/A'
    except RuntimeError:
        # Outside request context
        username = user or 'system'
        endpoint = 'N/A'
        ip = 'N/A'

    audit_logger.info(
        details,
        extra={
            'user': username,
            'action': action,
            'endpoint': endpoint,
            'ip': ip,
        },
    )


def log_to_db(username, action, endpoint, ip, details, is_authorized=True):
    """
    Log an audit event to the AuditLog database table.
    Silently fails if the table does not exist yet (e.g., before seed.py has run).
    """
    try:
        execute_db(
            "INSERT INTO AuditLog (Username, Action, Endpoint, IPAddress, Details, IsAuthorized) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (username, action, endpoint, ip, details, is_authorized),
        )
    except Exception:
        # Table may not exist yet; log to file instead
        audit_logger.warning(
            f"DB audit log failed — {details}",
            extra={
                'user': username,
                'action': action,
                'endpoint': endpoint,
                'ip': ip,
            },
        )


def get_current_username():
    """
    Helper to retrieve the current JWT user's username from the database.
    Returns 'anonymous' if not authenticated.
    """
    try:
        from flask_jwt_extended import get_jwt_identity
        from db import query_db

        user_id = get_jwt_identity()
        if user_id:
            member = query_db(
                "SELECT Username FROM Member WHERE MemberID = %s",
                (int(user_id),),
                one=True,
            )
            return member['Username'] if member else f'uid:{user_id}'
    except Exception:
        pass
    return 'anonymous'
