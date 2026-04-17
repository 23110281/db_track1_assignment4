#!/usr/bin/env python3
"""Fail if legacy generic DB helpers are used in API route modules."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
ROUTES_DIR = ROOT / "app" / "backend" / "routes"

# Disallow generic DB helpers inside route modules.
DISALLOWED_PATTERNS = [
    r"\bquery_db\s*\(",
    r"\bexecute_db\s*\(",
    r"\bexecute_transaction\s*\(",
    r"from\s+db\s+import\s+.*\bquery_db\b",
    r"from\s+db\s+import\s+.*\bexecute_db\b",
    r"from\s+db\s+import\s+.*\bexecute_transaction\b",
]

compiled = [re.compile(p) for p in DISALLOWED_PATTERNS]
violations = []

for path in sorted(ROUTES_DIR.glob("*.py")):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    for i, line in enumerate(lines, start=1):
        for pattern in compiled:
            if pattern.search(line):
                violations.append((path.relative_to(ROOT), i, line.strip()))

if violations:
    print("Found legacy generic DB helper usage in route files:")
    for relpath, line_no, snippet in violations:
        print(f"  - {relpath}:{line_no}: {snippet}")
    sys.exit(1)

print("OK: all route files use explicit shard-aware database access.")
