# ACYA PRODUCTION — PHASE A: DOCKER PORT SECURITY REPORT

- **Execution Date:** `2026-11-25` (`10:11:00Z` – `10:17:25Z`)
- **Production Host:** `<PROD_VPS_HOSTNAME>` (`<PROD_VPS_IP>` / `<PROD_VPS_IPV6>`)
- **Scope Executed:** **Phase A ONLY** (Loopback `127.0.0.1` binding of the four published application ports in `docker-compose.yml`)
- **Firewall / Nginx / Database / Backup / Swap / Logging Changes:** **NONE (0)**
- **Rollback Status:** **Not required** (All validation gates passed on first attempt)

---

## 1. Initial Configuration and Exposure Evidence

Prior to Phase A, the four core application services in `/home/ubuntu/acya-app/docker-compose.yml` published their host ports without an IP binding prefix, causing Docker to expose them on both IPv4 `0.0.0.0` and IPv6 `[::]`:

| Service (Compose) | Container Name | Original Container ID | Original Port Mapping | Exposed Host Listeners (`ss -lntp`) |
| :--- | :--- | :--- | :--- | :--- |
| `api` | `wood-app-api` | `90522b251943` | `"8080:80"` | `0.0.0.0:8080`, `[::]:8080` |
| `elance-app-ui` | `elance-app-ui` | `84eb08cb7185` | `"5000:3000"` | `0.0.0.0:5000`, `[::]:5000` |
| `admin-api` | `admin-elance-back` | `15410134542a` | `"8082:80"` | `0.0.0.0:8082`, `[::]:8082` |
| `admin-ui` | `admin-elance-front` | `6956acd00a91` | `"5002:3000"` | `0.0.0.0:5002`, `[::]:5002` |

### Pre-Execution Verification Summary
- **Active Compose Project:** `acya-app` (`/home/ubuntu/acya-app/docker-compose.yml`).
- **Nginx Active Upstreams (`/etc/nginx/sites-enabled/`):** All 17 `proxy_pass` directives for the 4 services target `http://localhost:8080`, `http://localhost:5000`, `http://localhost:8082`, and `http://localhost:5002` (`n8n.acya.site` targets `http://127.0.0.1:5678`). `nginx -t` passed.
- **Loopback Resolution (`getent ahosts localhost`):** `127.0.0.1` (`::1` is mapped only to `ip6-localhost ip6-loopback` in `/etc/hosts`; `getent ahostsv4 localhost` and `getent ahosts localhost` return `127.0.0.1`).
- **Host Resources:** Root `/` has `72 GiB` available (`26%` used); Docker Engine `28.2.2` (`overlay2`) healthy with `9` containers running.
- **Timestamped Backup Created:** `/root/acya-remediation-backups/phase-a-20261125-101200Z/`:
  - `docker-compose.yml.bak` (`171` lines, `6650` bytes, `0664 ubuntu:ubuntu`, SHA-256: `cc6fd0323465ad49f63e0100f404819e1eafb5f707830d10e7c52f4e7a4b3532`)
  - `docker-compose.effective.pre.yml` (`206` lines, effective `docker compose config` snapshot)

---

## 2. Compose Files Modified

Only **one** file was modified:
- [`/home/ubuntu/acya-app/docker-compose.yml`](file:///home/ubuntu/acya-app/docker-compose.yml)

No other files (including `docker-compose.n8n.yml`, Nginx configs, firewall rules, systemd units, or application code) were modified.

---

## 3. Exact Changes Applied (`git diff docker-compose.yml`)

```diff
diff --git a/docker-compose.yml b/docker-compose.yml
index f91214d6..ce648c5f 100644
--- a/docker-compose.yml
+++ b/docker-compose.yml
@@ -73,8 +73,7 @@ services:
       - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-acya-fcm-prod-dispatcher}
       - FIREBASE_MANAGEMENT_CREDENTIALS_PATH=/app/secrets/firebase-management-key.json
     ports:
-
-      - "8080:80"
+      - "127.0.0.1:8080:80"
     volumes:
       - ./storage/private/mobile:/app/storage/private/mobile
       - ./storage/secrets/firebase-service-account.json:/app/secrets/firebase-service-account.json:ro
@@ -100,7 +99,7 @@ services:
       - NODE_ENV=production
       - NEXT_PUBLIC_API_URL=https://acya.site/api/
     ports:
-      - "5000:3000"
+      - "127.0.0.1:5000:3000"
     depends_on:
       - api
     networks:
@@ -135,7 +134,7 @@ services:
       - BACKUP_SCHEDULER_URL=http://host.docker.internal:9095
       - BACKUP_SCHEDULER_SECRET=${BACKUP_SCHEDULER_SECRET}
     ports:
-      - "8082:80"
+      - "127.0.0.1:8082:80"
     volumes:
       - ./wood-app.api/db:/app/db:ro
       - /opt/acya-backup/state:/opt/acya-backup/state:ro
@@ -160,7 +159,7 @@ services:
       - NEXT_PUBLIC_API_URL=https://admin.acya.site/api/
       - BACKEND_INTERNAL_URL=http://admin-api:80/api/
     ports:
-      - "5002:3000"
+      - "127.0.0.1:5002:3000"
     depends_on:
       - admin-api
     networks:
```

`sudo docker compose -f /home/ubuntu/acya-app/docker-compose.yml config` validated cleanly with `host_ip: 127.0.0.1` on all four target services and zero changes to internal ports, environment variables, volumes, or networks.

---

## 4. Containers Recreated and Final Status

The four application containers were recreated **sequentially, one at a time**, using `sudo docker compose -f /home/ubuntu/acya-app/docker-compose.yml up -d --no-deps --force-recreate <service>`, verifying startup logs, local response, and Nginx reachability before proceeding to the next container:

| Order | Compose Service | Container Name | Old ID -> New ID | StartedAt (UTC) | Final Status | Restarts | New Port Binding |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `api` | `wood-app-api` | `90522b251943` -> `6d14e2c2553c` | `2026-11-25T10:13:24Z` | `running (healthy)` | `0` | `127.0.0.1:8080->80/tcp` |
| 2 | `elance-app-ui` | `elance-app-ui` | `84eb08cb7185` -> `3daf61467d6d` | `2026-11-25T10:14:19Z` | `running` | `0` | `127.0.0.1:5000->3000/tcp` |
| 3 | `admin-api` | `admin-elance-back` | `15410134542a` -> `e6a65fe9b0f3` | `2026-11-25T10:15:02Z` | `running` | `0` | `127.0.0.1:8082->80/tcp` |
| 4 | `admin-ui` | `admin-elance-front` | `6956acd00a91` -> `a94d5353f5c4` | `2026-11-25T10:15:38Z` | `running` | `0` | `127.0.0.1:5002->3000/tcp` |

---

## 5. Before / After Port Binding Evidence

### Before (`ss -lntp`)
```text
LISTEN 0 4096 0.0.0.0:5002  0.0.0.0:* users:(("docker-proxy",pid=1084361,fd=7))
LISTEN 0 4096 0.0.0.0:5000  0.0.0.0:* users:(("docker-proxy",pid=1085213,fd=7))
LISTEN 0 4096 0.0.0.0:8082  0.0.0.0:* users:(("docker-proxy",pid=1082066,fd=7))
LISTEN 0 4096 0.0.0.0:8080  0.0.0.0:* users:(("docker-proxy",pid=1083052,fd=7))
LISTEN 0 4096 [::]:5002     [::]:*    users:(("docker-proxy",pid=1084367,fd=7))
LISTEN 0 4096 [::]:5000     [::]:*    users:(("docker-proxy",pid=1085220,fd=7))
LISTEN 0 4096 [::]:8082     [::]:*    users:(("docker-proxy",pid=1082074,fd=7))
LISTEN 0 4096 [::]:8080     [::]:*    users:(("docker-proxy",pid=1083060,fd=7))
```

### After (`docker ps` & `ss -lntp`)
```text
CONTAINER ID   NAMES                            IMAGE                            STATUS                   PORTS
a94d5353f5c4   admin-elance-front               acya-app-admin-ui                Up 32 seconds            127.0.0.1:5002->3000/tcp
e6a65fe9b0f3   admin-elance-back                acya-app-admin-api               Up About a minute        127.0.0.1:8082->80/tcp
3daf61467d6d   elance-app-ui                    acya-elance-app-ui               Up About a minute        127.0.0.1:5000->3000/tcp
6d14e2c2553c   wood-app-api                     acya-app-api                     Up 2 minutes (healthy)   443/tcp, 127.0.0.1:8080->80/tcp

LISTEN 0 4096 127.0.0.1:5002 0.0.0.0:* users:(("docker-proxy",pid=1734428,fd=7))
LISTEN 0 4096 127.0.0.1:5000 0.0.0.0:* users:(("docker-proxy",pid=1733106,fd=7))
LISTEN 0 4096 127.0.0.1:8082 0.0.0.0:* users:(("docker-proxy",pid=1733766,fd=7))
LISTEN 0 4096 127.0.0.1:8080 0.0.0.0:* users:(("docker-proxy",pid=1732266,fd=7))
```

- **Zero** `0.0.0.0` or `[::]` listeners remain on ports `5000`, `5002`, `8080`, or `8082`.
- Docker automatically updated its own `nat DOCKER` (`destination 127.0.0.1`) and `raw PREROUTING` (`DROP tcp ! -i lo -d 127.0.0.1 --dport 5000,5002,8080,8082`) rules to reject any non-loopback packets targeting these ports.

---

## 6. Localhost, Nginx, and Public Domain Validation Results

### Localhost Upstream Validation
| Target | Result |
| :--- | :--- |
| `http://localhost:5000/` (`elance-app-ui`) | `HTTP 200` |
| `http://localhost:5002/` (`admin-elance-front`) | `HTTP 200` |
| `http://localhost:8080/api/ApiHealth/HealthCheck` (`wood-app-api`) | `HTTP 200` — `{"status":"Healthy","database":"Connected"}` |
| `http://localhost:8082/api/webhooks/whatsapp/verify` (`admin-elance-back`) | `HTTP 403` (expected controller verification rejection without token) |
| `http://localhost:8082/api/admin/Health/services` (`admin-elance-back`) | `HTTP 401` (expected JWT auth gate) |

### Public Domain Validation Through Nginx
| Domain / Endpoint | HTTP Status | Response / Verification |
| :--- | :---: | :--- |
| `http://acya.site/` | `301` | Redirects to `https://acya.site/` |
| `https://acya.site/` | `200` | `253,719` bytes served cleanly via Nginx -> `localhost:5000` |
| `https://acya.site/api/ApiHealth/HealthCheck` | `200` | `{"status":"Healthy","database":"Connected"}` via Nginx -> `localhost:8080` |
| `https://piqbit.acya.site/` | `200` | `253,719` bytes served cleanly |
| `https://piqbit.acya.site/api/ApiHealth/HealthCheck` | `200` | `{"status":"Healthy","database":"Connected"}` |
| `https://socobois.acya.site/` | `200` | `253,719` bytes served cleanly |
| `https://socobois.acya.site/api/ApiHealth/HealthCheck` | `200` | `{"status":"Healthy","database":"Connected"}` |
| `https://admin.acya.site/` | `200` | `7,341` bytes served cleanly via Nginx -> `localhost:5002` |
| `https://admin.acya.site/api/admin/Health/services` | `401` | Expected JWT auth gate via Nginx -> `localhost:8082` |
| `https://n8n.acya.site/` | `200` | `21,964` bytes served cleanly via Nginx -> `127.0.0.1:5678` |

---

## 7. Infrastructure Integrity Confirmation (Unrelated Services & Data Untouched)

All non-target containers kept their exact original container IDs and `StartedAt` timestamps:

| Container Name | Container ID | `StartedAt` (UTC) | Status | Untouched? |
| :--- | :--- | :--- | :--- | :---: |
| `8cdff3364501_wood-app-postgres` | `8cdff3364501` | `2026-09-16T19:54:38Z` | `Up 2 months (healthy)` | **YES** |
| `postgres-n8n` | `4961379b4090` | `2026-09-13T20:53:55Z` | `Up 2 months (healthy)` | **YES** |
| `n8n` | `8ac832b8d388` | `2026-11-11T21:26:19Z` | `Up 13 days` | **YES** |
| `acya-restore-test-pg` | `49175c52551f` | `2026-10-13T20:03:11Z` | `Up 6 weeks` | **YES** |
| `acya-restore-n8n-pg` | `b1b71d371f89` | `2026-10-13T20:10:56Z` | `Up 6 weeks` | **YES** |

- **Docker Volumes:** All 8 volumes (`acya-app_postgres_data`, `n8n_data`, `postgres_n8n`, `acya-restore-n8n-data`, `acya-restore-test-data`, and 3 anonymous volumes) unchanged.
- **Docker Networks:** All 7 networks (`acya-app_wood-app-network`, `acya_n8n_network`, `acya-restore-net`, `acya-restore-n8n-net`, `bridge`, `host`, `none`) unchanged.
- **Nginx:** Service `active`, zero config changes, zero errors on `woodapp-error.log` and `woodapp-admin-error.log`.

---

## 8. Rollback Status

- **Rollback Status:** **Not required.**
- **Rollback Backup Location:** `/root/acya-remediation-backups/phase-a-20261125-101200Z/docker-compose.yml.bak` (preserved on disk if ever needed).

---

## 9. Warnings & Observations

1. **Expected Transient SignalR Reset During `wood-app-api` Recreation:** A single `recv() failed (104: Connection reset by peer)` entry appeared in `/var/log/nginx/woodapp-tenant-error.log` at `10:13:30` for an active SignalR `/api/notificationHub` connection at the exact moment `wood-app-api` restarted; no further errors occurred afterward.
2. **Nginx Log Observation (Informational):** SignalR passes the JWT in the `access_token` query string on `/api/notificationHub`, which Nginx logs in error entries when an upstream resets. (Out of scope for Phase A; noted for future hardening.)
3. **Subsequent Phases Not Started:** Per instructions, execution has **stopped after Phase A**. Firewall hardening, Restic backup recovery, swap creation, and Docker log rotation have **not** been executed and await separate explicit authorization.
