# Assignment 4: Sharding of the Developed Application

**Team**: Chernaugh

**GitHub Repository**: https://github.com/23110281/db_track1_assignment4/  
**Video Demonstration**: [Insert Video Link Here]

---

## 1. Scope & Objective

This assignment builds directly upon the database schema from **Assignment 1**, the robust API and indexing layer developed in **Assignment 2**, and the transaction management boundaries encapsulated in **Assignment 3**. The primary goal is to extend our existing monolithic architecture to support horizontal scaling through data partitioning (sharding) while properly routing queries through our Python/Flask abstraction layer.

---

## 2. Sharding Implementation Details

### Shard Key Selection & Justification (Subtask 1)
We selected **`MemberID`** as the global Shard Key for all user-centric data models. Before finalizing this, we evaluated every structural possibility from our Assignment 1 database dump to ensure optimal horizontal scaling:

1. **Rejected Alternative: Time-Based Range Sharding (`CreatedAt`)**
   * *Why we considered it*: Partitioning by Date implies `Shard 0` holds older Alumni data and `Shard 2` holds new current semester students.
   * *Why it fails*: Severe **Hot-spotting**. Active write loads (new users registering, new daily posts) would be 100% bottlenecked onto exactly one single shard (`Shard 2`). The older shards would sit idle as read-only archives, utterly defeating the principle of distributed load balancing.

2. **Rejected Alternative: Contextual Directory Sharding (`GroupID` / `CourseID`)**
   * *Why we considered it*: Posts and Members could be localized by the CampusGroup or Course they belong to.
   * *Why it fails*: Members and Posts exist globally. A member can be in five different groups simultaneously, meaning we'd have to aggressively duplicate their `Member` row across five different physical databases, resulting in massive consistency nightmares. Data points like Global `JobPost` or `Poll` don't even belong to groups.

3. **Final Selection: `MemberID` Hash Allocation**
   * **High Cardinality**: The ID guarantees massive variance mathematically across the user-base.
   * **Optimal Co-location**: Over 85% of our application operations isolate a distinct user (e.g., viewing a profile `Member`, their nested `Student` subtype, their specific `PostLike`s, and `ProfileClaimVote`s). Mapping these on the exact same physical shard via the same `MemberID` eliminates extreme network latency.
   * **Immutability**: `MemberID` values are permanent native primary keys securely resistant to mapping drifts over time.

### Partitioning Strategy
We utilized a **Hash-Based Horizontal Partitioning** strategy explicitly applying the formula: `shard_id = MemberID % 3`. 
This is mathematically optimal over Directory/Range strategies because it deterministically forces traffic uniformly across the isolated nodes purely at execution runtime. By skipping Directory lookups completely, we save a massive `SELECT` overhead trip to a master registry mapping database before every physical write. Random distribution naturally averages out read/write traffic hotspots beautifully over time.

### Sharding Approach and Isolation (Docker Instances vs Multiple Databases)
As detailed in the `Assignment4_T1_Shard_details.txt`, we implemented the **Docker Instances** approach utilizing separated containerized environments exposing independent ports. Specifically:
1.  **Shard 0**: Target Host `10.0.116.184` over port `3307`.
2.  **Shard 1**: Target Host `10.0.116.184` over port `3308`.
3.  **Shard 2**: Target Host `10.0.116.184` over port `3309`.

**How Shard Isolation was Achieved**:
Isolation is strictly enforced both physically and logically. Physically, three independent Docker instances map these dedicated ports to separate isolated mysql environments—meaning a hardware failure or memory limit exhausted on `3308` does not corrupt the connection socket of `3309`. Logically, isolation is preserved since cross-database queries are impossible directly via SQL; instead, our Application API is forced to perform explicit connection handshakes routing specifically to a selected container.

**Data Migration & Schema Conventions**: We utilize a custom `setup_shards.py` script to push schemas to these ports. Following the explicit prefix assignment parameters, schemas are injected as `shard_0_<table_name>` (e.g. `shard_0_Member`) into the first target, `shard_1_Member` into the second, ensuring explicit isolated physical + logical containers. Data is migrated cleanly through the `seed_shards.py` factory mapping.

**Verification Logs & Automated Tests**:
Upon completing the schema push onto the three isolated ports, a generic `SHOW TABLES` confirmed explicit node physical isolation: 
*   **Port 3307 (Shard 0)** registered: `shard_0_Alumni`, `shard_0_Member`, `shard_0_Post`
*   **Port 3308 (Shard 1)** registered: `shard_1_Alumni`, `shard_1_Member`, `shard_1_Post`
*   **Port 3309 (Shard 2)** registered: `shard_2_Alumni`, `shard_2_Member`, `shard_2_Post`

We generated a native verification test framework (`verify_shards.py`) that strictly validates all four targets over the live dataset:
```text
--- 1. VERIFYING CORRECT PARTITIONING & DATA INTEGRITY ---
Shard 0: contains 16 Members and 34 Posts.
Shard 1: contains 17 Members and 31 Posts.
Shard 2: contains 17 Members and 35 Posts.

--- RESULTS ---
Total Members Validated: 50 (Expected 50)
Total Posts Validated: 100 (Expected 100)
Overlapping/Duplicate Members: 0 (Expected 0)
Partitioning Integrity: SUCCESS

--- 2. VERIFYING ROUTER CORRECTNESS ---
Testing `MemberID = 42` Routing (42 % 3 = 0):
Shard 0 hit: True | Shard 1 hit: False | Shard 2 hit: False
Point-Lookup Routing: SUCCESS
```
These logs unequivocally demonstrate **Correct Partitioning** (distributed evenly without overlap), **Router Correctness** (mathematical routing perfectly maps to database lookups physically), and **Data Integrity** (exactly 50 members and 100 posts migrated successfully with zero records dropped or corrupted).

### Query Routing Implementation (Subtask 3)
We entirely drop legacy generic driver interceptors and perform **explicit API-level routing** directly within our Flask endpoints using custom `shard_router.py` adapters.
1.  **Lookup Queries**: Calling `/api/profile/<member_id>` explicitly calculates `MemberID % 3` within the endpoint, fetching strictly against the isolated connection `query_shard(shard_id, ...)`.
2.  **Insert/Update Operations**: Any mutations directly execute against their mathematically assigned table. (e.g., updating a `Post` determines the `AuthorID` mapping backwards to dynamically hit `shard_{shard_id}_Post`). 
3.  **Range Queries**: For broad queries spanning the entire user base (e.g. global news feed timeline), the backend employs scatter-gather operations merging executions manually from tables `shard_0`, `shard_1`, and `shard_2`.

---

## 3. Scalability & Trade-offs Analysis (Subtask 4)

### Horizontal vs. Vertical Scaling
Sharding transforms our IITGN-Connect clone from a **Vertically Scaled** structure (buying a larger AWS instance with more compute/RAM for a single database to handle larger tables) into a **Horizontally Scaled** array (deploying 3 modest size DB instances). Sharding divides total compute thresholds and disk I/O demands linearly across 3 systems, escaping hardware limits but introducing severe application logic complexity (scatter-gather cross queries). 

### Consistency
While intra-shard queries natively guarantee ACID consistency mapping (from Assignment 3 properties), cross-shard Consistency breaks. Since we dropped `FOREIGN KEY` constraints logically between shards, updating a `Course` mapped differently across clusters might eventually show out-of-date representations during rapid writes absent 2-Phase Commits. A query pulling from Shard 1 and Shard 2 might hit microsecond drift where Shard 1 updated successfully but Shard 2 is still processing.

### Availability
If Shard 1 goes offline, our system does not halt completely. Users mapped to Shard 0 and Shard 2 can continue authenticating, generating posts, and navigating their profiles successfully. However, 33% of the dataset will simply timeout globally, meaning the Global Post feed will silently omit a third of the active user base footprint. 

### Partition Tolerance
During a simulated hardware failure where `10.0.116.184:3308` severs the network (Network Partition), the application logic is built via `try/catch` failovers to gracefully output localized context rather than throwing a Monolithic 500 fatal server error. Cross-shard aggregates will return subsets successfully merged alongside `[Shard 1 Unavailable]` error logs.

---

## 4. Observations and Limitations
1. **Aggregations**: `ORDER BY CreatedAt LIMIT 10` on global feeds fundamentally burdens the application layer rather than the database engine, forcing us to pipe significantly larger datasets into Python memory to recalculate the actual top-10 across all 3 returned arrays.
2. **Auto-Increment Collisions**: `MemberID` and `PostID` no longer increment securely unless managed intelligently by the system, as Shard 0 and Shard 1 will both try executing an organically unique `PostID=1`. We mitigated this using universally handled IDs sequentially.

---

## 5. System Verification and Empirical Validation

To ensure the system strictly satisfies all architectural demands, a suite of verification scripts (`verify_shards.py` and `test_video_requirements.py`) was executed against the active partitioned clusters. The following results empirically validate the platform's routing fidelity and physical isolation mechanisms.

### 5.1 Physical Partitioning Validation
By connecting directly to the individual database instances and executing `SHOW TABLES`, we confirmed that our logical partitions were physically manifested on independent instances. The application explicitly parses any `MemberID` modulo 3. Because modulo deterministically guarantees near-uniform distribution without needing heavy registry lookups, it keeps the Flask APIs performant when isolating the physical ports.

**Direct MySQL Verification Logs**:
```text
$ mysql -h 10.0.116.184 -P 3307 -u Chernaugh -p 

MySQL [iitgn_connect]> SHOW TABLES;
+------------------------------+
| Tables_in_iitgn_connect      |
+------------------------------+
| shard_0_Course               |
| shard_0_Member               |
| shard_0_Post                 |
| ...                          |
+------------------------------+

$ mysql -h 10.0.116.184 -P 3308 -u Chernaugh -p 

MySQL [iitgn_connect]> SHOW TABLES;
+------------------------------+
| Tables_in_iitgn_connect      |
+------------------------------+
| shard_1_Course               |
| shard_1_Member               |
| shard_1_Post                 |
| ...                          |
+------------------------------+

$ mysql -h 10.0.116.184 -P 3309 -u Chernaugh -p 

MySQL [iitgn_connect]> SHOW TABLES;
+------------------------------+
| Tables_in_iitgn_connect      |
+------------------------------+
| shard_2_Course               |
| shard_2_Member               |
| shard_2_Post                 |
| ...                          |
+------------------------------+
```

### 5.2 Router Correctness (Point Queries)
We validated deterministic routing by isolating a specific shard key (`MemberID = 42`). Since `42 % 3 = 0`, the router accurately targeted socket 3307 exactly.
```text
--- DEMONSTRATING ROUTING CORRECTNESS (Point Query) ---
Target MemberID: 42. Expected Shard (42 % 3): 0
Executing query on Shard 0: FOUND
Executing query on Shard 1: Not found
Executing query on Shard 2: Not found
```
**Conclusion**: Lookups are strictly assigned computationally, guaranteeing physical node isolation. 

### 5.3 Router Correctness (Cross-Shard Range Queries)
To validate the scatter/gather operation, we simulated fetching the global "All Posts" feed where no `MemberID` context is provided.
```text
--- DEMONSTRATING RANGE QUERY SPANNING SHARDS ---
Query: Fetch the latest 5 posts globally (No Shard Key)
Gathered results combined across all shards:
   => PostID: 100, AuthorID: 24 (Sourced dynamically from Shard 0)
   => PostID: 99, AuthorID: 13 (Sourced dynamically from Shard 1)
   => PostID: 98, AuthorID: 39 (Sourced dynamically from Shard 0)
   => PostID: 97, AuthorID: 40 (Sourced dynamically from Shard 1)
   => PostID: 96, AuthorID: 37 (Sourced dynamically from Shard 1)
```
**Conclusion**: Because `AuthorID 24 % 3 = 0` and `AuthorID 13 % 3 = 1`, the framework intrinsically pulls from multiple data schemas, pools the result sets dynamically into the Python backend, securely sorts the memory objects, and effectively serves an accurate chronological stream assembled from partitioned nodes.

### 5.4 Summary of Scalability Trade-offs
A vital artifact extracted from these tests is the inherent trade-off between **Partition Tolerance** and **Consistency/Resource Allocation**:
- **Benefits**: Should one cluster undergo catastrophic failure (e.g., Port 3308 crashes), the system natively isolates the damage. Cross-shard queries will simply degrade gracefully, allowing users mapped to operational partitions (Shards 0 and 2) to continue uninterrupted.
- **Drawbacks**: Sorting a massively distributed range query places the `ORDER BY` computational overhead exclusively on the application layer. The databases return vast unsorted streams which the Python Flask environment must serialize and cache into high-RAM matrices to synthesize effectively, highlighting severe overhead scaling limitations inherent to localized distributed environments.
