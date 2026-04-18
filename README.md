# IITGN Connect: College Social Media Platform

**CS 432 Databases | Assignment 4 - Database Sharding**  
**Indian Institute of Technology, Gandhinagar**

---

## Table of Contents

- [Team & Project Links](#team--project-links)
- [Project Overview](#project-overview)
- [Setup & Replicability](#setup--replicability)
- [1. Assignment 4: Database Sharding Architecture](#1-assignment-4-database-sharding-architecture)
- [2. Database Schema, API & Session Management](#2-database-schema-api--session-management)
- [3. Security, Access Control & Audit Logging](#3-security-access-control--audit-logging)
- [4. Indexing & Query Optimization](#4-indexing--query-optimization)

---

## Team & Project Links

| Name                      | Student ID |
| ------------------------- | ---------- |
| Patel Ridham Vijaykumar   | 23110238   |
| Patel Parthiv Rajeshkumar | 23110237   |
| Laksh Jain                | 23110185   |
| Shriniket Behera          | 23110306   |
| Rudra Pratap Singh        | 23110281   |

- **Video Demonstration:** [https://youtu.be/Xx92OgD0WwA](https://youtu.be/Xx92OgD0WwA)

---

## Project Overview

IITGN Connect is a full-stack college social media platform built with **React** (frontend) and **Flask** (backend) using **MySQL** with **raw SQL queries**. For **Assignment 4**, the core monolithic backend has been refactored to support **Horizontal Scaling** via a **Hash-Based Distributed Sharding** architecture deployed across independent Docker database instances seamlessly orchestrated by our custom Python API router.

---

## Setup & Replicability

### Prerequisites

- **Python 3.10+**
- **Docker & Docker Compose** (for local control-plane DB: `AuditLog` and `OTPVerification`)
- **Node.js 18+** and **npm**

### Quick Start

**1. Ensure Assignment Shards Are Reachable**

Assignment 4 data tables are deployed to three shard instances (remote infra used in our setup):

- Shard 0: Port `3307`
- Shard 1: Port `3308`
- Shard 2: Port `3309`

The shard connection targets are configured in `app/backend/shard_config.py`.

**2. Start Local Control-Plane Services (Docker Compose)**

This project keeps `AuditLog` and `OTPVerification` on a local MySQL instance used by the API.

```bash
docker compose up -d
```

**3. Backend Setup**

```bash
cd app/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**4. Configure Environment**

Edit `app/backend/.env`.

Important separation:

- `MYSQL_*` values are for the local control-plane database only.
- Shard host/port/user/password are taken from `app/backend/shard_config.py`.

Example for local run (without compose):

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DB=iitgn_connect
SMTP_HOST=smtp.gmail.com
# ... other standard SMTP mappings
```

Example when API runs via compose service network:

```env
MYSQL_HOST=control_db
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DB=iitgn_connect
```

**5. Deploy Sharded Schemas & Seed Data**

Assignment 4 relies strictly on explicitly routed environments. Execute the native Python schema generation framework to inject prefixed namespaces (`shard_0_Member`, `shard_1_Member`, etc) and subsequently scatter the seed data computationally over the hashes:

```bash
python setup_shards.py
python seed_shards.py
```

> _(The verification constraints strictly monitor terminal feedback ensuring zero overlap existed organically across these deployments)._

**6. Start the Backend**

```bash
cd app/backend
python app.py
# API server securely proxies across all 3 databases parallel at http://localhost:5001
```

**7. Start the Frontend** (new terminal)

```bash
cd app/iitgn-connect
npm install
npm run dev
# Frontend accessible at http://localhost:5173
```

---

## 1. Assignment 4: Database Sharding Architecture

Our implementation fundamentally shifted the project from a Vertically Scaled Monolithic array into a precise Horizontally Distributed environment safely navigating `try/catch` Partition Tolerance principles:

1. **Shard Key Selection**: `MemberID` serves as the universal shard key since >85% of our traffic revolves around querying highly isolated internal profiles cleanly.
2. **Hash-Based Distribution**: Application logic enforces `MemberID % 3`, cleanly and automatically translating generic Python API calls into rigidly allocated explicit node routes (Ports 3307, 3308, or 3309).
3. **Scatter-Gather Assembly**: When parsing operations lacking context vectors (like a global chronological `Post` Timeline), our API dynamically multi-threads scatter scans across all active partitions natively, caching partial subsets in memory, sorting matrices locally on the Flask server, and effectively masking the partitioning complexity away from the front-end user's timeline.

_View `assignment4_report.md` for our raw Empirical Validation tests executing explicit Point mapping guarantees and trade-off architectures._

---

## 2. Database Schema, API & Session Management

_(From core Assignment 1 and 2 directives)_

The backend exposes **40+ RESTful API endpoints**. Following our Assignment 4 sharding refactoring, API endpoints internally use `execute_shard(shard_id)` instead of the legacy `execute_db()` broadcast mechanism.

- **ISA hierarchy**: Member is the supertype; dependent data uses `ON DELETE CASCADE`.
- **JWT Authentication**: Identity is mathematically stored representing mathematical mapping tokens allowing us to calculate `MemberID % 3` natively off the JWT extraction safely.

---

## 3. Security, Access Control & Audit Logging

**Role-Based Access Control (RBAC)** remains strict globally. An Admin account maps across the distributed shards flawlessly.
**Unauthorized API Request Detection** and **MySQL Triggers** detect operations that attempt to bypass securely authenticated API calls preventing illicit database drift natively across any particular shard target.

---

## 4. Indexing & Query Optimization

_(Retained extensively from existing deployments)_

Our **26 custom indexes** remain highly active on the local target tables (`idx_post_createdat` naturally filters row evaluations even on distributed isolated fetches). Benchmarking EXPLAIN output confirms `+99% speedup` reductions by collapsing full table scans universally even while nested in single partitions.

---

## Team

**Team Chernaugh**

- Parthiv Patel
- Shriniket Behera
- Ridham Patel
- Laksh Jain
- Rudra Pratap Singh

**Course:** CS 432 Databases (Semester II, 2025-2026)  
**Institute:** Indian Institute of Technology, Gandhinagar
