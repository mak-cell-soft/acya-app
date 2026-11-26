# ACYA — Phase 2 Wave 1: Docker Log Rotation Deployment Report

**Date:** 2026-11-26
**Repository:** `/home/ubuntu/acya-app` (`main` @ `c7aa138cfb354e76a3eecfe4ac15a2b36d0d5fe4`)
**Reference Plan:** `docs/infrastructure/ACYA_PHASE_2_DOCKER_RESOURCE_HARDENING_PLAN.md`
**Backup Saved Outside Repo:** `/home/ubuntu/acya-archives/docker-compose-backups/docker-compose.yml.20261126T192128Z.bak`
**Status:** **DEPLOYED & VERIFIED** (Uncommitted; Rollback Not Required)

---

## 1. Exact Configuration Changes (`docker-compose.yml`)

Added identical JSON log rotation (`driver: json-file`, `max-size: "10m"`, `max-file: "5"`) to **only** the 4 approved stateless services (`api`, `elance-app-ui`, `admin-api`, `admin-ui` — `+20 / -0` lines total).
- **Memory limits (`mem_limit` / `mem_reservation`):** Not added (deferred per policy).
- **`postgres` service:** Untouched.
- **`docker-compose.n8n.yml` & `/etc/docker/daemon.json`:** Untouched.
- **Validation:** `sudo docker compose config --quiet` passed cleanly.

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"
```

---

## 2. Container IDs Before & After + Logging Verification

Rolled out strictly one service at a time using `sudo docker compose up -d --no-deps --no-build <service>` (zero image rebuilds):

| Rollout Order | Compose Service | Container Name | Old ID | New ID | Status | Restarts | Verified Logging Config |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :--- |
| **1** | `admin-api` | `admin-elance-back` | `e6a65fe9b0f3` | **`724814187a6c`** | `running` | 0 | `json-file {"max-file":"5","max-size":"10m"}` |
| **2** | `admin-ui` | `admin-elance-front` | `a94d5353f5c4` | **`6637f5f0c464`** | `running` | 0 | `json-file {"max-file":"5","max-size":"10m"}` |
| **3** | `api` | `wood-app-api` | `8a99f96f7f91` | **`43bcdb7485be`** | `running (healthy)` | 0 | `json-file {"max-file":"5","max-size":"10m"}` |
| **4** | `elance-app-ui` | `elance-app-ui` | `486b4b96ba25` | **`853046f52d33`** | `running` | 0 | `json-file {"max-file":"5","max-size":"10m"}` |

---

## 3. Public HTTPS & Endpoint Verification

| Service | Endpoint Checked | Observed Response |
| :--- | :--- | :--- |
| `admin-api` | `https://admin.acya.site/api/admin/enterprises` & `http://127.0.0.1:8082/api/admin/enterprises` | `HTTP 404` (ASP.NET Core responded cleanly through Nginx; EF Core DB queries verified in startup logs) |
| `admin-ui` | `https://admin.acya.site` & `https://admin.acya.site/login` | **`HTTP 200`** (`Next.js 16.4.3`, `Ready in 270ms`) |
| `api` | `https://socofeb.acya.site/api/Analytics/unsold-merchandise?months=6` (unauthenticated) | **`HTTP 401`** (authentication enforcement intact) |
| `api` | `https://socofeb.acya.site/api/enterprise/public-settings?slug=socofeb` | **`HTTP 200`** |
| `elance-app-ui` | `https://socofeb.acya.site/analytics` & `https://socofeb.acya.site/login` | **`HTTP 200`** (`Next.js 16.4.6`, `Ready in 235ms`) |

---

## 4. PostgreSQL, n8n & Persistent Volume Preservation Evidence

All stateful and unrelated containers retained their **exact original container IDs** with `Restarts=0` and `OOMKilled=false`:

| Container | ID Before | ID After | Status | Restarts | Logging Config |
| :--- | :--- | :--- | :--- | :-: | :--- |
| `8cdff3364501_wood-app-postgres` | `8cdff3364501` | **`8cdff3364501`** (unchanged) | `running (healthy)` | 0 | `json-file {}` |
| `postgres-n8n` | `4961379b4090` | **`4961379b4090`** (unchanged) | `running (healthy)` | 0 | `json-file {"max-file":"3","max-size":"20m"}` |
| `n8n` | `8ac832b8d388` | **`8ac832b8d388`** (unchanged) | `running` | 0 | `json-file {"max-file":"5","max-size":"50m"}` |
| `acya-restore-test-pg` | `49175c52551f` | **`49175c52551f`** (unchanged) | `running` | 0 | `json-file {}` |
| `acya-restore-n8n-pg` | `b1b71d371f89` | **`b1b71d371f89`** (unchanged) | `running` | 0 | `json-file {}` |

- **Persistent Volumes:** All **`8`** Docker volumes intact.
- **Latest Verified Backup (Preflight):** `runId: 20261126T023000Z-67dc7f0d` (`outcome: "success"`, `exitCode: 0`).

---

## 5. Disk, RAM & Error Observations

- **Root Disk (`/dev/sda1`):** `28 GiB` used (`29%`), `69 GiB` available (recreating `admin-elance-back` also cleared its previous `62 MB` unbounded JSON log).
- **RAM (`free -h`):** `3.6 GiB` used, **`7.8 GiB` available**, `184 MiB / 4.0 GiB` swap.
- **OOM Events (`journalctl -k --since "1 hour ago"`):** **0 OOM events**.
- **Warnings / Errors:** Zero application startup errors. Standard Docker Compose deprecation notice (`version` attribute obsolete) and orphan notice (`n8n`, `postgres-n8n` from `docker-compose.n8n.yml`) only.

---

## 6. Rollback Status

- **Rollback Required:** **No.** All 4 services passed sequential health, logging, and HTTPS checks on first attempt.
- **Backup Preserved:** `/home/ubuntu/acya-archives/docker-compose-backups/docker-compose.yml.20261126T192128Z.bak` remains available for instant rollback if ever needed.
- **Git Policy:** Left uncommitted and unpushed as instructed.
