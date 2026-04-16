# Assignment 4: Horizontal Database Sharding
**Team**: Chernaugh

## 1. Sharding Design & Architecture

### Partitioning Strategy
For our deployment across three remote MySQL shards (`10.0.116.184` on ports `3307`, `3308`, `3309`), we used a **Hash-Based Horizontal Partitioning** strategy. 

*   **Shard Key**: `MemberID`. 
*   **Routing Function**: `shard_id = MemberID % 3`.

### Schema Configuration
We categorized tables based on query access patterns and size bounds:
1.  **Local Tables** (`AuditLog`, `OTPVerification`): Reside strictly on the local Database Container. Ensures API footprint traces are isolated and prevents connection latency for short-lived OTP variables.
2.  **Replicated Tables** (`CampusGroup`, `Course`, `JobPost`): Identically copied across all three shards. This allows for JOINs locally on each shard for `GROUP` queries without large cross-network aggregation payloads.
3.  **Sharded Tables** (`Member`, `Post`, `Comment` etc.): Partitioned out based on the originator's ID (`AuthorID` mapping back to `MemberID`).

### Data Seeding
We built `setup_shards.py` to deploy schema out to the remote ports dynamically, forcefully stripping `FOREIGN KEY` constraints. Cross-shard queries mathematically cannot support foreign keys. We then utilized the Python `Faker` library in `seed_shards.py` to pseudo-randomly generate 50 members and 100 posts, mapped accurately to shards via modulo arithmetic.

## 2. Query Routing Implementation

Rather than hard-coding Shard execution queries manually, we took an **interceptor approach** via our backend Database access layer (`db.py` -> `shard_db.py`).

1.  **Read Interception**: For `query_db`, we parse the originating table name dynamically from the SQL stream. Non-sharded tables are executed locally. Sharded tables utilize a generic `query_all_shards()` approach that parallel-queries the shards and merges Dict-based tuple output.
2.  **Write Interception**: The `execute_db()` parser targets DML inputs. In most situations where we insert into base entities like `Member`, we manually pass the ID modulo down to `execute_shard()`. For standard application writes like posts and groups, the backend intercepts this and triggers broadcasts.

## 3. Scalability Capabilities and Trade-offs

### High Availability and Throughput
*   **Benefit**: Horizontal sharding divides read/write pressures across three distinct isolated nodes, drastically reducing locking overhead on primary nodes and distributing disk I/O.
*   **Capacity Expansion**: Adding new data points doesn't saturate a monolithic drive volume.

### Challenges & Known Trade-offs
1.  **Join Constraints**: Local MySQL queries cannot easily JOIN a `Post` from Shard 1 with a `Comment` from Shard 2. We mitigate this via `query_all_shards` logic that aggregates them, but this shifts compute overhead to the Application tier.
2.  **Auto-Increment Collisions**: `MemberID` and `PostID` typically use Database auto-generations. In a distributed context, doing this organically builds collisions (ID 1 on Shard 0 conflicts with ID 1 on Shard 1 during merge operations). We resolved this on critical nodes by calculating random IDs manually within `db.py`, ensuring a uniform distribution.
3.  **Global Order Limitations**: Implementing `ORDER BY CreatedAt LIMIT 10` on a global fan-out requires each shard to retrieve its top 10 rows, pushing 30 results to the application layer to enforce the overarching sorting heuristic. The application footprint widens dynamically here.
4.  **Transaction Consistency**: Enacting `execute_transaction` essentially functions as partitioned single-DB cascades, which does not provide authentic 2PC (Two-Phase Commits) robustness. If Shard 0 fails halfway through, rolling back Shard 1 is unmanageable without explicit log reconciliation.

<br>
Overall, the implementation validates core requirements showing functional connectivity to `.184` external components and proper routing mechanisms.
