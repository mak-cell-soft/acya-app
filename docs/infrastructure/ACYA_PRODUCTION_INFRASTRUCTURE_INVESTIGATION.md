# ACYA PRODUCTION VPS — SECURITY & INFRASTRUCTURE INVESTIGATION REPORT

- **Report Date:** `2026-11-25`
- **Target Host:** `<PROD_VPS_HOSTNAME>` (`<PROD_VPS_IP>` / `<PROD_VPS_IPV6>`)
- **Administration / Storage / Monitoring Host:** `<BACKUP_VPS_HOSTNAME>` (`<BACKUP_VPS_IP>`)
- **Investigation Mode:** Strictly **READ-ONLY** (Zero modifications made to Docker Compose, containers, firewall rules, SSH, swap, Restic repositories/snapshots, PostgreSQL, or application code)
- **Git Working Tree State:** Clean (`git status -s` returned empty)

---

## Executive Summary

A comprehensive, read-only diagnostic audit of the ACYA production VPS (`<PROD_VPS_IP>`) was conducted across six operational domains: **Docker Network Exposure**, **Firewall Architecture**, **Swap & Memory Pressure**, **Restic Backup Pipeline**, **Docker Logging & Monitoring Overhead**, and **ASP.NET Core / Next.js Application Metrics**.

### Summary of Findings

| Finding ID | Domain | Title | Severity | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **FINDING-01** | Docker & Firewall | Public Internet Exposure of Application & Backoffice Container Ports (`5000`, `5002`, `8080`, `8082`) Bypassing Nginx Reverse Proxy | **CRITICAL** | **CONFIRMED** |
| **FINDING-02** | Firewall | Default `ACCEPT` Policy on `INPUT` Chain (IPv4 & IPv6) Without Host Perimeter Firewall | **HIGH** | **CONFIRMED** |
| **FINDING-03** | Docker Runtime | Two Long-Running Isolated Restore PostgreSQL Containers (`acya-restore-test-pg`, `acya-restore-n8n-pg`) Running for 6 Weeks | **LOW** | **CONFIRMED** |
| **FINDING-04** | Swap & Memory | Zero Swap Space Configured (`0B`) with Kernel Memory Overcommit Exceeding `CommitLimit` (`Committed_AS` 7.55 GiB vs `CommitLimit` 5.70 GiB) | **MEDIUM** | **CONFIRMED** |
| **FINDING-05** | Restic Backups | Daily Automated Backups Failing Every Night Since `2026-11-19` with Exit Code `10` (`repositoryWritesAuthorized: false`) | **CRITICAL** | **CONFIRMED** |
| **FINDING-06** | Restic Backups | Restic Repository Contains 4 Historical Stale Shared Locks from `2026-10-13` and Lacks Automated Snapshot Retention Policy | **MEDIUM** | **CONFIRMED** |
| **FINDING-07** | Restic Backups | Legacy Phase 16C Systemd Units (`acya-backup.service/.timer`, `acya-backup-sync.path/.service`) Coexist with Phase 11B Runner | **LOW** | **CONFIRMED** |
| **FINDING-08** | Docker Logging | Unbounded `json-file` Docker Container Logs on Core ERP Stack (`postgres`, `api`, `elance-app-ui`, `admin-api`, `admin-ui`) | **MEDIUM** | **CONFIRMED** |
| **FINDING-09** | Application Metrics | Absence of Prometheus Metrics Exporters in ASP.NET Core APIs & Next.js Frontends and Missing Docker Healthchecks on 3 of 4 App Containers | **MEDIUM** | **CONFIRMED** |

---

## Domain Architecture Overview

### 1. Docker Network & Container Inventory

9 containers are currently running across 4 custom Docker bridge networks (`acya-app_wood-app-network`, `acya_n8n_network`, `acya-restore-net`, `acya-restore-n8n-net`):

| Container Name | Image | Status | Network(s) & Internal IP | Published Host Ports |
| :--- | :--- | :--- | :--- | :--- |
| `elance-app-ui` | `acya-elance-app-ui` | Up 22 hours | `acya-app_wood-app-network` (`172.18.0.6/16`) | `0.0.0.0:5000->3000/tcp`, `[::]:5000->3000/tcp` |
| `admin-elance-front` | `acya-app-admin-ui` | Up 22 hours | `acya-app_wood-app-network` (`172.18.0.5/16`) | `0.0.0.0:5002->3000/tcp`, `[::]:5002->3000/tcp` |
| `wood-app-api` | `acya-app-api` | Up 22 hours (healthy) | `acya-app_wood-app-network` (`172.18.0.3/16`) | `0.0.0.0:8080->80/tcp`, `[::]:8080->80/tcp` |
| `admin-elance-back` | `acya-app-admin-api` | Up 22 hours | `acya-app_wood-app-network` (`172.18.0.4/16`) | `0.0.0.0:8082->80/tcp`, `[::]:8082->80/tcp` |
| `8cdff3364501_wood-app-postgres` | `postgres:15-alpine` | Up 2 months (healthy) | `acya-app_wood-app-network` (`172.18.0.2/16`) | None (`5432/tcp` internal only) |
| `n8n` | `docker.n8n.io/n8nio/n8n:latest` | Up 13 days | `acya_n8n_network` (`172.19.0.3/16`), `acya-app_wood-app-network` (`172.18.0.7/16`) | `127.0.0.1:5678->5678/tcp` |
| `postgres-n8n` | `postgres:15-alpine` | Up 2 months (healthy) | `acya_n8n_network` (`172.19.0.2/16`) | None (`5432/tcp` internal only) |
| `acya-restore-test-pg` | `postgres:15-alpine` | Up 6 weeks | `acya-restore-net` (`172.20.0.2/16`) | None |
| `acya-restore-n8n-pg` | `postgres:15-alpine` | Up 6 weeks | `acya-restore-n8n-net` (`172.21.0.2/16`) | None |

### 2. Host Listening Services (`ss -tulnp`)

| Protocol | Bind Address & Port | Process | Firewall Protection Status |
| :--- | :--- | :--- | :--- |
| `tcp` | `0.0.0.0:22` / `[::]:22` | `sshd` | Open to public internet; protected by `fail2ban` (`inet f2b-table`) |
| `tcp` | `0.0.0.0:80` | `nginx` | Open to public internet (HTTP -> HTTPS 301 redirect; `drop-unknown` returns 444) |
| `tcp` | `0.0.0.0:443` | `nginx` | Open to public internet (TLS termination, rate-limiting, `X-Tenant-Slug` injection) |
| `tcp` | `0.0.0.0:5000` / `[::]:5000` | `docker-proxy` (`elance-app-ui`) | **UNPROTECTED — Externally accessible via Docker DNAT + FORWARD ACCEPT** |
| `tcp` | `0.0.0.0:5002` / `[::]:5002` | `docker-proxy` (`admin-elance-front`) | **UNPROTECTED — Externally accessible via Docker DNAT + FORWARD ACCEPT** |
| `tcp` | `0.0.0.0:8080` / `[::]:8080` | `docker-proxy` (`wood-app-api`) | **UNPROTECTED — Externally accessible via Docker DNAT + FORWARD ACCEPT** |
| `tcp` | `0.0.0.0:8082` / `[::]:8082` | `docker-proxy` (`admin-elance-back`) | **UNPROTECTED — Externally accessible via Docker DNAT + FORWARD ACCEPT** |
| `tcp` | `127.0.0.1:5678` | `docker-proxy` (`n8n`) | Protected (bound to `127.0.0.1` + `raw PREROUTING` drop for `! -i lo`) |
| `tcp` | `0.0.0.0:9095` | `python3` (`acya-scheduler-daemon`) | Protected in IPv4 `INPUT` (`lo`, `172.18.0.0/16`, `<BACKUP_VPS_IP>` allowed; others dropped) |
| `tcp` | `<PROD_VPS_IP>:9100` | `node_exporter` | Protected in IPv4 `INPUT` (`<BACKUP_VPS_IP>` allowed; others dropped) |
| `udp` | `0.0.0.0:49299` / `[::]:49299` | WireGuard (`wg0`, `10.200.0.2/24`) | Open for peer `<ADMIN_CLIENT_IP>:51820` (`10.200.0.1/32`) |

---

## Detailed Findings

---

### FINDING-01 — Public Internet Exposure of Application & Backoffice Container Ports (`5000`, `5002`, `8080`, `8082`) Bypassing Nginx Reverse Proxy

1. **Finding ID:** `FINDING-01`
2. **Severity:** **CRITICAL**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   In [docker-compose.yml](file:///home/ubuntu/acya-app/docker-compose.yml), four core application services publish their ports without an explicit loopback bind address (`127.0.0.1:`):
   - `wood-app-api` (`api`, line 77): `- "8080:80"`
   - `elance-app-ui` (`elance-app-ui`, line 103): `- "5000:3000"`
   - `admin-elance-back` (`admin-api`, line 138): `- "8082:80"`
   - `admin-elance-front` (`admin-ui`, line 163): `- "5002:3000"`
   By contrast, `n8n` in [docker-compose.n8n.yml](file:///home/ubuntu/acya-app/docker-compose.n8n.yml#L40) is properly bound to loopback: `- "127.0.0.1:5678:5678"`.
5. **Evidence:**
   ```text
   $ sudo docker ps --format "table {{.Names}}\t{{.Ports}}"
   NAMES                            PORTS
   elance-app-ui                    0.0.0.0:5000->3000/tcp, [::]:5000->3000/tcp
   admin-elance-front               0.0.0.0:5002->3000/tcp, [::]:5002->3000/tcp
   wood-app-api                     443/tcp, 0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
   admin-elance-back                0.0.0.0:8082->80/tcp, [::]:8082->80/tcp
   n8n                              127.0.0.1:5678->5678/tcp

   $ sudo iptables -t nat -L DOCKER -n -v --line-numbers
   num   pkts bytes target     prot opt in     out     source               destination         
   4        0     0 DNAT       tcp  --  !br-667ea0710721 *       0.0.0.0/0            127.0.0.1            tcp dpt:5678 to:172.18.0.7:5678
   5       81  4568 DNAT       tcp  --  !br-667ea0710721 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8082 to:172.18.0.4:80
   6      470 25392 DNAT       tcp  --  !br-667ea0710721 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080 to:172.18.0.3:80
   7       72  4240 DNAT       tcp  --  !br-667ea0710721 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:5002 to:172.18.0.5:3000
   8      267 15008 DNAT       tcp  --  !br-667ea0710721 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:5000 to:172.18.0.6:3000

   $ sudo iptables -L DOCKER -n -v --line-numbers
   num   pkts bytes target     prot opt in     out     source               destination         
   1      267 15008 ACCEPT     tcp  --  !br-667ea0710721 br-667ea0710721  0.0.0.0/0            172.18.0.6           tcp dpt:3000
   2       72  4240 ACCEPT     tcp  --  !br-667ea0710721 br-667ea0710721  0.0.0.0/0            172.18.0.5           tcp dpt:3000
   3      470 25392 ACCEPT     tcp  --  !br-667ea0710721 br-667ea0710721  0.0.0.0/0            172.18.0.3           tcp dpt:80
   4       81  4568 ACCEPT     tcp  --  !br-667ea0710721 br-667ea0710721  0.0.0.0/0            172.18.0.4           tcp dpt:80

   $ sudo iptables -L DOCKER-USER -n -v --line-numbers
   Chain DOCKER-USER (1 references)
   num   pkts bytes target     prot opt in     out     source               destination         
   (empty)
   ```
6. **Root Cause:**
   Omitting `127.0.0.1:` in `docker-compose.yml` port mappings instructs Docker to bind `0.0.0.0` and `[::]` via `docker-proxy` and insert `DNAT` rules in `nat PREROUTING -> DOCKER` and `ACCEPT` rules in `filter FORWARD -> DOCKER-BRIDGE -> DOCKER`. Furthermore, the `DOCKER-USER` chain is empty, so external packets arriving on `ens3` (`<PROD_VPS_IP>`) are DNATed directly to the container IPs (`172.18.0.3`–`172.18.0.6`) and accepted in `FORWARD` (notice the non-zero packet counters: `470` packets on `8080`, `267` on `5000`, `81` on `8082`, `72` on `5002`, even though Nginx proxies to `localhost` which traverses `lo` / `OUTPUT`, not `PREROUTING` from external interfaces!).
7. **Production Impact:**
   - **Complete Reverse Proxy Bypass:** External actors can connect directly to `http://<PROD_VPS_IP>:8080`, `:8082`, `:5000`, and `:5002` over unencrypted HTTP.
   - **Rate-Limiting Bypass:** Nginx rate-limiting zones (`zone_global`, `zone_api`, `zone_auth` 5r/m on `/api/account/login`, `zone_print`) and `drop-unknown` (`return 444`) are completely bypassed when querying ports `8080` or `8082` directly.
   - **Tenant Resolution Spoofing Surface:** Nginx enforces subdomain extraction (`~^(?<tenant>[^.]+)\.acya\.site$`) and overwrites `X-Tenant-Slug $tenant` while blocking reserved subdomains (`api|admin|n8n|preprod|mail|www`). Direct access to `<PROD_VPS_IP>:8080` allows callers to supply arbitrary `X-Tenant-Slug` headers or `?tenant=` query parameters directly to `SubdomainTenantResolver` without Nginx's host/subdomain validation.
   - **Admin API Exposure:** Port `8082` (`admin-elance-back`) is reachable directly on all routes (including any non-`/api/admin/` routes if added in the future), whereas Nginx only proxies `/api/admin/` on `admin.acya.site`.
8. **Recommended Correction:**
   - **Step 1 (Immediate Zero-Downtime Firewall Mitigation via `DOCKER-USER` & `INPUT`):** Insert rules in `DOCKER-USER` (and `INPUT` for IPv6/local delivery) dropping traffic arriving on public interface `ens3` destined to container ports `80` and `3000` (or original destination ports `5000`, `5002`, `8080`, `8082` via `-m conntrack --ctorigdstport`), before touching any containers.
   - **Step 2 (Permanent Compose Binding):** Update `docker-compose.yml` port mappings to bind strictly to `127.0.0.1`:
     - `"127.0.0.1:8080:80"` (`api`)
     - `"127.0.0.1:5000:3000"` (`elance-app-ui`)
     - `"127.0.0.1:8082:80"` (`admin-api`)
     - `"127.0.0.1:5002:3000"` (`admin-ui`)
     Recreate each service one-by-one using `sudo docker compose up -d --no-deps <service>` (never using `down` or `--remove-orphans`).
9. **Dependencies That Must Be Preserved:**
   - Host Nginx (`/etc/nginx/sites-enabled/default`) proxies to `http://localhost:8080`, `http://localhost:8082`, `http://localhost:5000`, and `http://localhost:5002`. Note that on Ubuntu, `localhost` resolves to `127.0.0.1` (and `::1` in `/etc/hosts` if configured — verify `/etc/hosts` or ensure Nginx uses `127.0.0.1` so IPv6 `::1` fallback does not cause 502s when Docker binds IPv4 `127.0.0.1`).
   - Inter-container communication on `acya-app_wood-app-network` (`admin-ui` -> `http://admin-api:80/api/`, `api` -> `postgres:5432`, `api` -> `http://n8n:5678`, `admin-api` -> `http://host.docker.internal:9095`) uses internal Docker DNS and bridge routing, which is unaffected by host port bindings.
10. **Risk Level:** **LOW** (if `/etc/hosts` / Nginx `127.0.0.1` resolution is verified and `DOCKER-USER` rules target `-i ens3`).
11. **Rollback Procedure:**
    - If `DOCKER-USER` rules cause any unexpected issue: `sudo iptables -F DOCKER-USER`.
    - If `127.0.0.1:` port bindings in `docker-compose.yml` need rollback: revert the 4 lines in `docker-compose.yml` and run `sudo docker compose up -d --no-deps <service>`.

---

### FINDING-02 — Default `ACCEPT` Policy on `INPUT` Chain (IPv4 & IPv6) Without Host Perimeter Firewall

1. **Finding ID:** `FINDING-02`
2. **Severity:** **HIGH**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   - `ufw` is not installed (`rc ufw 0.36.2-9` — removed, configuration files only).
   - `/etc/nftables.conf` defines empty `accept` chains, while the active firewall is managed by `iptables-persistent` (`iptables-nft` v1.8.11) loaded from `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`, plus Fail2Ban (`table inet f2b-table` blocking banned IPs on TCP port `22`).
   - In `/etc/iptables/rules.v4`, the `INPUT` chain has default policy `ACCEPT` and only contains 6 rules restricting TCP ports `9100` (`node_exporter`) and `9095` (`acya-scheduler-daemon`).
   - In `/etc/iptables/rules.v6`, the `INPUT` and `FORWARD` chains have default policy `ACCEPT` with **zero** filtering rules.
5. **Evidence:**
   ```text
   $ sudo iptables -L INPUT -n -v --line-numbers
   Chain INPUT (policy ACCEPT 68M packets, 76G bytes)
   num   pkts bytes target     prot opt in     out     source               destination         
   1    1725K  144M ACCEPT     tcp  --  *      *       <BACKUP_VPS_IP>         0.0.0.0/0            tcp dpt:9100 /* node_exporter: allow monitoring VPS */
   2     1435 75704 DROP       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:9100 /* node_exporter: block all other sources */
   3       24  1820 ACCEPT     tcp  --  lo     *       0.0.0.0/0            0.0.0.0/0            tcp dpt:9095
   4       91  7815 ACCEPT     tcp  --  *      *       172.18.0.0/16        0.0.0.0/0            tcp dpt:9095 /* scheduler: allow docker containers */
   5        0     0 ACCEPT     tcp  --  *      *       <BACKUP_VPS_IP>         0.0.0.0/0            tcp dpt:9095 /* scheduler: allow Admin/Storage VPS */
   6       30  1536 DROP       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:9095 /* scheduler: block all other sources */

   $ sudo ip6tables -L -n -v --line-numbers
   Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
   Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
   Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
   ```
6. **Root Cause:**
   Instead of a default-deny (`DROP`) or final reject/drop rule on `INPUT`, the firewall was configured on an ad-hoc blacklist basis for specific ports (`9100` and `9095`), leaving all other ports (including IPv6 `[::]:5000`, `[::]:5002`, `[::]:8080`, `[::]:8082`, and any future host-bound listeners) open by default.
7. **Production Impact:**
   - Even if IPv4 `DOCKER-USER` rules are added, `docker-proxy` also listens on IPv6 (`[::]:5000`, `[::]:5002`, `[::]:8080`, `[::]:8082`) and the host has a public IPv6 address (`<PROD_VPS_IPV6>/128` on `ens3`). With `ip6tables` `INPUT` and `FORWARD` policies set to `ACCEPT` and zero rules, IPv6 traffic to `[<PROD_VPS_IPV6>]:8080` reaches `docker-proxy` directly via `ip6tables INPUT`!
   - Any service accidentally started on `0.0.0.0` or `[::]` in the future is immediately exposed to the internet.
8. **Recommended Correction:**
   Harden `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6` (without installing or enabling `ufw`, which conflicts with Docker's iptables chains):
   - In `INPUT` (both IPv4 and IPv6):
     1. Accept `RELATED,ESTABLISHED` connections.
     2. Accept all traffic on `lo` (`-i lo`).
     3. Accept all traffic on `wg0` (`-i wg0`, WireGuard tunnel `10.200.0.0/24`).
     4. Accept ICMP / ICMPv6 (essential for IPv6 Neighbor Discovery and PMTU).
     5. Accept TCP `22` (SSH), `80` (HTTP), `443` (HTTPS).
     6. Accept UDP `49299` (WireGuard listening port).
     7. Preserve existing TCP `9100` (from `<BACKUP_VPS_IP>` and `10.200.0.1`) and TCP `9095` (from `lo`, `172.18.0.0/16`, `<BACKUP_VPS_IP>`) rules.
     8. Accept traffic from Docker bridge subnets (`172.18.0.0/16`, `172.19.0.0/16`) to host services if needed, then `DROP` all other inbound packets coming from `-i ens3`.
9. **Dependencies That Must Be Preserved:**
   - **SSH (`22/tcp`)** and current active SSH sessions (`RELATED,ESTABLISHED`).
   - **Nginx (`80/tcp`, `443/tcp`)** for `acya.site`, `*.acya.site`, `admin.acya.site`, `n8n.acya.site`.
   - **WireGuard (`49299/udp` and interface `wg0` `10.200.0.2/24` <-> `<ADMIN_CLIENT_IP>:51820` / `10.200.0.1/32`)**.
   - **Prometheus `node_exporter` (`9100/tcp`)** scraped by `<BACKUP_VPS_IP>`.
   - **Backup Scheduler Daemon (`9095/tcp`)** accessed by `admin-elance-back` (`172.18.0.4` via `host.docker.internal:9095`) and `<BACKUP_VPS_IP>`.
   - **Fail2Ban (`inet f2b-table`)** in nftables.
10. **Risk Level:** **MEDIUM** (Any mistake in `INPUT` rules can sever SSH access; must be applied with an automatic rollback timer / `iptables-apply` before saving to `/etc/iptables/rules.v4` and `rules.v6`).
11. **Rollback Procedure:**
    Restore `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6` from backup via `sudo iptables-restore < /etc/iptables/rules.v4.bak` and `sudo ip6tables-restore < /etc/iptables/rules.v6.bak`.

---

### FINDING-03 — Two Long-Running Isolated Restore PostgreSQL Containers (`acya-restore-test-pg`, `acya-restore-n8n-pg`) Running for 6 Weeks

1. **Finding ID:** `FINDING-03`
2. **Severity:** **LOW**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   Two standalone PostgreSQL 15 containers (`acya-restore-test-pg` on `acya-restore-net` with a 2 GiB memory limit, and `acya-restore-n8n-pg` on `acya-restore-n8n-net` with a 1.5 GiB memory limit) have been running continuously for 6 weeks.
5. **Evidence:**
   ```text
   CONTAINER ID   NAMES                  IMAGE                STATUS       PORTS
   b1b71d371f89   acya-restore-n8n-pg    postgres:15-alpine   Up 6 weeks   
   49175c52551f   acya-restore-test-pg   postgres:15-alpine   Up 6 weeks   

   NAME                  CPU %   MEM USAGE / LIMIT   MEM %
   acya-restore-n8n-pg   0.00%   46.68MiB / 1.5GiB   3.04%
   acya-restore-test-pg  0.01%   96MiB / 2GiB        4.69%
   ```
   In `/opt/acya-backup/config/backup.json`:
   ```json
   "guards": {
     "excludedContainers": [
       "acya-restore-test-pg",
       "acya-restore-n8n-pg"
     ],
     "minTenantCount": 16
   }
   ```
6. **Root Cause:**
   These containers were provisioned as isolated sandbox targets for tenant restore verification (`acya-tenant-restore`) and drill testing, and are explicitly excluded from production backups in `backup.json`.
7. **Production Impact:**
   - They consume ~142.7 MiB of RAM combined while idle and have no published ports (` DOCKER-ISOLATION-STAGE-1` isolates `172.20.0.0/16` and `172.21.0.0/16`).
   - Not a security vulnerability, as they are completely isolated from `acya-app_wood-app-network` and the host network, and are required if `acya-tenant-restore` drills or sandbox restores are executed.
8. **Recommended Correction:**
   - **Do NOT remove** these containers without confirming whether `acya-tenant-restore` expects `acya-restore-test-pg` and `acya-restore-n8n-pg` to be running on standby. Keep them documented as part of the Phase 11 restore sandbox architecture.
9. **Dependencies That Must Be Preserved:**
   - `/opt/acya-backup/bin/acya-tenant-restore` and `backup.json` `guards.excludedContainers`.
10. **Risk Level:** **LOW**
11. **Rollback Procedure:** N/A (No change recommended).

---

### FINDING-04 — Zero Swap Space Configured (`0B`) with Kernel Memory Overcommit Exceeding `CommitLimit`

1. **Finding ID:** `FINDING-04`
2. **Severity:** **MEDIUM**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   - **Total RAM:** `11,675 MiB` (`11,956,072 kB` / ~11.4 GiB)
   - **Used RAM:** `4,382 MiB` (~4.3 GiB, ~37.5%)
   - **Free RAM:** `1,319 MiB` (~1.3 GiB)
   - **Shared RAM:** `821 MiB`
   - **Buffers / Page Cache:** `7,252 MiB` (~7.1 GiB)
   - **Available RAM:** `7,293 MiB` (~7.1 GiB, ~62.5% available)
   - **Configured Swap:** `0B` (`swapon --show` is empty; no swap entry in `/etc/fstab`)
   - **Root Disk (`/dev/sda1`):** `96 GiB` total (`ext4`), `24 GiB` used (`26%`), **`72 GiB` available**
   - **Docker Container Memory Usage:** ~`1,652.6 MiB` (~1.61 GiB total across all 9 containers: `wood-app-api` 588.2 MiB, `n8n` 396.4 MiB, `admin-elance-back` 207.1 MiB, `wood-app-postgres` 121.1 MiB, `acya-restore-test-pg` 96.0 MiB, `elance-app-ui` 90.7 MiB, `admin-elance-front` 63.7 MiB, `acya-restore-n8n-pg` 46.7 MiB, `postgres-n8n` 42.8 MiB).
5. **Evidence:**
   ```text
   $ free -m
                  total        used        free      shared  buff/cache   available
   Mem:           11675        4382        1319         821        7252        7293
   Swap:              0           0           0

   $ grep -E "MemTotal|MemFree|MemAvailable|Buffers|Cached|SwapTotal|SwapFree|Committed_AS|CommitLimit" /proc/meminfo
   MemTotal:       11956072 kB
   MemFree:         1351116 kB
   MemAvailable:    7468560 kB
   Buffers:         1335420 kB
   Cached:          4531780 kB
   SwapTotal:             0 kB
   SwapFree:              0 kB
   CommitLimit:     5978036 kB
   Committed_AS:    7912184 kB

   $ cat /proc/pressure/memory
   some avg10=0.00 avg60=0.00 avg300=0.00 total=112039654
   full avg10=0.00 avg60=0.00 avg300=0.00 total=102135137

   $ sysctl vm.swappiness vm.overcommit_memory vm.overcommit_ratio
   vm.swappiness = 60
   vm.overcommit_memory = 0
   vm.overcommit_ratio = 50

   $ df -h /
   Filesystem      Size  Used Avail Use% Mounted on
   /dev/sda1        96G   24G   72G  26% /
   ```
6. **Root Cause:**
   The cloud image (`LABEL=cloudimg-rootfs` on `/dev/sda1`) was provisioned without a swap partition or `/swapfile`. Because `SwapTotal` is `0 kB`, the kernel's `CommitLimit` (50% of RAM + Swap = `5,978,036 kB` / ~5.70 GiB) is currently exceeded by `Committed_AS` (`7,912,184 kB` / ~7.55 GiB). While `vm.overcommit_memory = 0` uses heuristic overcommit (and recent PSI memory pressure is `0.00` with zero OOM kills in `dmesg`), there is zero swap cushion during transient memory spikes (such as concurrent Next.js/ASP.NET Core image builds via `docker compose build`, QuestPDF/ClosedXML large report generation, or `pg_dump` + Restic backup runs).
7. **Production Impact:**
   - If a memory spike occurs during a `docker compose build` or heavy multi-tenant PDF/Excel export, the Linux kernel cannot page out cold anonymous memory (`~1.9 GiB` of idle pages across Node.js, .NET, and standby Postgres containers) and would have to invoke the OOM killer directly.
   - **Can a persistent 4 GB swap file safely be created?** **YES.** The root filesystem (`/dev/sda1`) is formatted as `ext4` (which natively supports `fallocate` / `dd` swapfiles without CoW fragmentation issues) and has **72 GiB of free space** (74% free). Allocating a 4 GiB `/swapfile` will consume only 5.5% of the available free disk space, leaving 68 GiB free, and will raise `CommitLimit` from `5.70 GiB` to `9.70 GiB` (above `Committed_AS` `7.55 GiB`).
8. **Recommended Correction:**
   - Create a 4 GiB swap file at `/swapfile` with permissions `0600 root:root`, initialize with `mkswap`, enable with `swapon /swapfile`, persist in `/etc/fstab` (`/swapfile none swap sw 0 0`), and tune `vm.swappiness=10` in `/etc/sysctl.d/99-swappiness.conf` so the kernel strongly prefers keeping active database and application working sets in the 11.4 GiB physical RAM and only uses swap as an emergency safety buffer.
9. **Dependencies That Must Be Preserved:**
   - `/opt/acya-backup/config/backup.json` enforces `"minFreeBytes": 5368709120` (5.0 GiB minimum free disk space). With 68 GiB remaining after a 4 GiB swapfile, this threshold has >63 GiB of margin.
10. **Risk Level:** **LOW** (Creating and enabling a swapfile is an online, non-disruptive operation requiring zero container restarts or downtime).
11. **Rollback Procedure:**
    `sudo swapoff /swapfile && sudo sed -i '\|/swapfile|d' /etc/fstab && sudo rm -f /swapfile /etc/sysctl.d/99-swappiness.conf && sudo sysctl -w vm.swappiness=60`.

---

### FINDING-05 — Daily Automated Backups Failing Every Night Since `2026-11-19` with Exit Code `10` (`repositoryWritesAuthorized: false`)

1. **Finding ID:** `FINDING-05`
2. **Severity:** **CRITICAL**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   - **Backup Architecture:** Phase 11B standalone Python runner v2.0.0 (`/opt/acya-backup/bin/acya-backup-runner`) configured via `/opt/acya-backup/config/backup.json`.
   - **Destination:** `sftp:<BACKUP_USER>@<BACKUP_VPS_IP>:/data/backups/restic` (Restic 0.19.1, Repository ID prefix `8a26915761a4`, format v2) using `/etc/acya-backup/acya_backup_ed25519` (`0600`), `/etc/acya-backup/known_hosts` (`0600`), and `/etc/acya-backup/.restic_password` (`0600`).
   - **Schedule:** `acya-backup-runner.timer` is **enabled and active**, with drop-in `/etc/systemd/system/acya-backup-runner.timer.d/10-schedule.conf` configured for `*-*-* 02:30:00 UTC` (`03:30 Africa/Tunis`).
   - **Write Gate State:** In `/opt/acya-backup/config/backup.json` (line 4), `"repositoryWritesAuthorized": false`.
5. **Evidence:**
   ```text
   $ sudo cat /opt/acya-backup/logs/scheduler-audit.log
   {"timestamp": "2026-11-07T19:56:11Z", "action": "SET_SCHEDULE", "performedBy": "SuperAdmin", "details": {"time": "03:30", "timezone": "Africa/Tunis", "utcTime": "02:30", "onCalendar": "*-*-* 02:30:00 UTC"}}
   {"timestamp": "2026-11-18T09:56:23Z", "action": "ENABLE_TIMER", "performedBy": "amine.klabi", "details": {"timerUnit": "acya-backup-runner.timer"}}
   {"timestamp": "2026-11-19T11:48:19Z", "action": "SET_SCHEDULE", "performedBy": "amine.klabi", "details": {"time": "03:30", "timezone": "Africa/Tunis", "utcTime": "02:30", "onCalendar": "*-*-* 02:30:00 UTC"}}

   $ sudo journalctl -u acya-backup-runner.service -n 12 --no-pager
   Nov 24 02:30:00 <PROD_VPS_HOSTNAME> systemd[1]: Starting acya-backup-runner.service - ACYA Phase 11B Production Backup Runner...
   Nov 24 02:30:00 <PROD_VPS_HOSTNAME> acya-backup-runner[890379]: 2026-11-24T02:30:00Z [INFO] started run 20261124T023000Z-f1c5908e (mode=full, trigger=systemd-timer)
   Nov 24 02:30:00 <PROD_VPS_HOSTNAME> acya-backup-runner[890379]: 2026-11-24T02:30:00Z [ERROR] run 20261124T023000Z-f1c5908e failed at stage=preflight category=writes_not_authorized: full backup execution is blocked while repositoryWritesAuthorized is false
   Nov 24 02:30:00 <PROD_VPS_HOSTNAME> systemd[1]: acya-backup-runner.service: Main process exited, code=exited, status=10/n/a
   Nov 24 02:30:01 <PROD_VPS_HOSTNAME> systemd[1]: acya-backup-runner.service: Failed with result 'exit-code'.
   Nov 25 02:30:00 <PROD_VPS_HOSTNAME> systemd[1]: Starting acya-backup-runner.service - ACYA Phase 11B Production Backup Runner...
   Nov 25 02:30:00 <PROD_VPS_HOSTNAME> acya-backup-runner[1519698]: 2026-11-25T02:30:00Z [INFO] started run 20261125T023000Z-6107f6ec (mode=full, trigger=systemd-timer)
   Nov 25 02:30:00 <PROD_VPS_HOSTNAME> acya-backup-runner[1519698]: 2026-11-25T02:30:00Z [ERROR] run 20261125T023000Z-6107f6ec failed at stage=preflight category=writes_not_authorized: full backup execution is blocked while repositoryWritesAuthorized is false
   Nov 25 02:30:00 <PROD_VPS_HOSTNAME> systemd[1]: acya-backup-runner.service: Main process exited, code=exited, status=10/n/a
   Nov 25 02:30:01 <PROD_VPS_HOSTNAME> systemd[1]: acya-backup-runner.service: Failed with result 'exit-code'.
   ```
6. **Root Cause:**
   During Phase 11C.1 on `2026-11-06`, `"repositoryWritesAuthorized"` in `/opt/acya-backup/config/backup.json` was temporarily set to `true` for a single manual backup (`snapshot 2071d164`) and then intentionally reset to `false` until the daily timer was ready to be enabled. On `2026-11-18T09:56:23Z`, user `amine.klabi` enabled `acya-backup-runner.timer` via the Backoffice UI (`acya-scheduler-daemon` on port `9095`). However, `acya-scheduler-daemon` has `/opt/acya-backup/config` mounted under `ReadOnlyPaths` and does not toggle `"repositoryWritesAuthorized": true` in `/opt/acya-backup/config/backup.json`. Consequently, all 8 scheduled backup runs between `2026-11-19` and `2026-11-25` have aborted immediately at `preflight` with exit code `10` (`writes_not_authorized`).
7. **Production Impact:**
   - **19-Day RPO Gap:** No production database or file backup snapshot has been created since **`2026-11-06T10:11:37Z`** (snapshot `2071d164`).
   - All 6 existing snapshots (`5a78f673`, `bbb68d5d`, `1fbd94a9`, `f93ac4c4`, `36a26b4e`, `2071d164`) and network/SFTP connectivity to `<BACKUP_VPS_IP>:22` are intact and verified reachable (`repository.reachable: true`), so enabling the write gate will immediately restore daily backups.
8. **Recommended Correction:**
   - Set `"repositoryWritesAuthorized": true` in `/opt/acya-backup/config/backup.json` (preserving `0600 root:root` permissions).
   - Trigger one immediate verification run (`sudo systemctl start acya-backup-runner.service`) or verify the next `02:30:00 UTC` run, and refresh `/opt/acya-backup/state/tenant-backup-history.json` (`sudo /opt/acya-backup/bin/acya-backup-history --config /opt/acya-backup/config/backup.json`).
9. **Dependencies That Must Be Preserved:**
   - File permissions on `/opt/acya-backup/config/backup.json` (`0600 root:root`) and `/opt/acya-backup/state/*` (`0644 root:root` so `admin-elance-back` container, which bind-mounts `/opt/acya-backup/state:ro`, can read `last-run.json`, `last-success.json`, `scheduler-config.json`, and `tenant-backup-history.json`).
10. **Risk Level:** **LOW** (The full pipeline was already end-to-end verified in `37.9s` during Phase 11C.1 on `2026-11-06`).
11. **Rollback Procedure:**
    Set `"repositoryWritesAuthorized": false` in `/opt/acya-backup/config/backup.json`.

---

### FINDING-06 — Restic Repository Contains 4 Historical Stale Shared Locks from `2026-10-13` and Lacks Automated Snapshot Retention Policy

1. **Finding ID:** `FINDING-06`
2. **Severity:** **MEDIUM**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   - **Locks:** `acya-backup-lock-inspect` reports 4 `stale_shared` locks in `sftp:<BACKUP_USER>@<BACKUP_VPS_IP>:/data/backups/restic` created on `2026-10-13` (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`, age ~42.5 days, dead PIDs `311438`, `309837`, `317496`, `333248`).
   - **Retention Policy:** In `/opt/acya-backup/lib/acya_backup/restic.py`, `FORBIDDEN_SUBCOMMANDS` explicitly blocks `unlock`, `repair`, `prune`, `forget`, `restore`, `rebuild-index`, `key`, and `migrate` on the production runner for append-only safety. Only local log files have a 90-day retention (`logRetentionDays: 90`).
5. **Evidence:**
   ```text
   $ sudo /opt/acya-backup/bin/acya-backup-lock-inspect --config /opt/acya-backup/config/backup.json
   {
     "repository": {
       "reachable": true,
       "repositoryVersion": 2,
       "repositoryIdPrefix": "8a26915761a4"
     },
     "lockReport": {
       "status": "stale_shared_only",
       "canProceedWithBackup": true,
       "unlockPerformed": false,
       "staleThresholdSeconds": 1800,
       "counts": {
         "total": 4,
         "activeExclusive": 0,
         "activeShared": 0,
         "staleExclusive": 0,
         "staleShared": 4
       },
       "blockingReasons": []
     }
   }
   ```
6. **Root Cause:**
   The 4 stale shared locks were left behind during manual testing on `2026-10-13` under Restic 0.16.4. By design, the Phase 11B production runner prohibits destructive Restic subcommands (`unlock`, `forget`, `prune`) from being executed automatically by the production host so that a compromised production host or bug cannot prune snapshots.
7. **Production Impact:**
   - Because `"allowStaleShared": true` is set in `backup.json` and the 4 locks are non-exclusive (`exclusive: false`), **they do NOT block `restic backup`**. However, they emit `stale_shared_lock_present` warnings on every run and will block any future exclusive repository maintenance (`restic prune` or locked `restic check`) until `restic unlock` is run.
   - Without a periodic retention policy (e.g., managed from the Admin/Storage VPS `<BACKUP_VPS_IP>` or an operator-authorized maintenance job), repository storage on `<BACKUP_VPS_IP>` will grow by ~90–100 MiB/day (~3 GiB/month).
8. **Recommended Correction:**
   - When explicitly authorized by the operator during a maintenance window (when no backup is active), execute a one-time `restic unlock` against the repository to clear the 4 dead October 13 shared locks.
   - Keep `forget` and `prune` forbidden on the production VPS runner (`<PROD_VPS_HOSTNAME>`) to preserve append-only immutability from the production side, and schedule snapshot retention (`restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune`) directly on the Storage/Admin VPS (`<BACKUP_VPS_IP>`) outside the `02:30 UTC` backup window.
9. **Dependencies That Must Be Preserved:**
   - Append-only safety design of `/opt/acya-backup/lib/acya_backup/restic.py` (`FORBIDDEN_SUBCOMMANDS`).
   - Tenant backup history catalog (`/opt/acya-backup/state/tenant-backup-history.json`), which must be regenerated by `acya-backup-history` whenever snapshots are added or forgotten.
10. **Risk Level:** **LOW**
11. **Rollback Procedure:** N/A (`restic unlock` only removes stale lock metadata files whose PIDs no longer exist).

---

### FINDING-07 — Legacy Phase 16C Systemd Units (`acya-backup.service/.timer`, `acya-backup-sync.path/.service`) Coexist with Phase 11B Runner

1. **Finding ID:** `FINDING-07`
2. **Severity:** **LOW**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   Alongside the active Phase 11B units (`acya-backup-runner.service`, `acya-backup-runner.timer`, `acya-scheduler-daemon.service`), legacy Phase 16C systemd unit files still exist in `/etc/systemd/system/`:
   - `acya-backup.service` (`ExecStart=/usr/local/bin/acya-production-backup.sh`) — `disabled` / `inactive`
   - `acya-backup.timer` — `disabled` / `inactive`
   - `acya-backup-sync.path` (`PathModified=/var/lib/acya-backup-state/backup-schedule.json`) — **`enabled`**
   - `acya-backup-sync.service` (`ExecStart=/usr/local/bin/acya-apply-backup-timer.sh`) — `static`
5. **Evidence:**
   ```text
   $ systemctl list-unit-files | grep acya
   acya-backup-runner.service        static          -
   acya-backup-sync.service          static          -
   acya-backup.service               disabled        enabled
   acya-scheduler-daemon.service     enabled         enabled
   acya-backup-sync.path             enabled         enabled
   acya-backup-runner.timer          enabled         enabled
   acya-backup.timer                 disabled        enabled
   ```
6. **Root Cause:**
   When Phase 11B/11C.2 replaced `/usr/local/bin/acya-production-backup.sh` and `/var/lib/acya-backup-state/` with `/opt/acya-backup/`, the legacy `acya-backup.timer` was disabled, but `acya-backup-sync.path` was left enabled watching `/var/lib/acya-backup-state/backup-schedule.json`.
7. **Production Impact:**
   - Currently benign because `/var/lib/acya-backup-state/backup-schedule.json` has `"enabled": false` and has not been modified since `2026-10-05`. However, if anything ever touches `/var/lib/acya-backup-state/backup-schedule.json` with `"enabled": true`, `acya-backup-sync.path` would trigger `/usr/local/bin/acya-apply-backup-timer.sh` and re-enable the legacy `acya-backup.timer` (`01:00 UTC`), causing dual backup scripts to run.
8. **Recommended Correction:**
   - Disable and stop `acya-backup-sync.path` (`sudo systemctl disable --now acya-backup-sync.path`) and mask `acya-backup.service` and `acya-backup.timer` so the legacy script cannot be accidentally re-activated.
9. **Dependencies That Must Be Preserved:**
   - `acya-backup-runner.service`, `acya-backup-runner.timer`, and `acya-scheduler-daemon.service` must remain untouched and active.
10. **Risk Level:** **LOW**
11. **Rollback Procedure:**
    `sudo systemctl unmask acya-backup.service acya-backup.timer && sudo systemctl enable --now acya-backup-sync.path`.

---

### FINDING-08 — Unbounded `json-file` Docker Container Logs on Core ERP Stack

1. **Finding ID:** `FINDING-08`
2. **Severity:** **MEDIUM**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   - **Docker Daemon Log Config:** `/etc/docker/daemon.json` does not exist. Docker defaults to the `json-file` logging driver with **no `max-size` or `max-file` limits**.
   - **Per-Container Log Configuration & Current Sizes:**
     - `/admin-elance-back`: `json-file`, `Opts: {}` (unbounded), current size: **`35 MiB`**
     - `/wood-app-api`: `json-file`, `Opts: {}` (unbounded), current size: **`14 MiB`**
     - `/8cdff3364501_wood-app-postgres`: `json-file`, `Opts: {}` (unbounded), current size: **`738 KiB`**
     - `/elance-app-ui`: `json-file`, `Opts: {}` (unbounded), current size: **`292 KiB`**
     - `/admin-elance-front`: `json-file`, `Opts: {}` (unbounded), current size: **`1.6 KiB`**
     - `/n8n`: `json-file`, `Opts: {"max-file":"5","max-size":"50m"}` (bounded to 250 MiB max in `docker-compose.n8n.yml`), current size: **`93 KiB`**
     - `/postgres-n8n`: `json-file`, `Opts: {"max-file":"3","max-size":"20m"}` (bounded to 60 MiB max in `docker-compose.n8n.yml`), current size: **`1.2 MiB`**
   - **Host Logrotate:** `/etc/logrotate.d/` has no Docker container log rotation configuration.
   - **Existing Monitoring Stack on Production VPS (`<PROD_VPS_IP>`):**
     - Only `node_exporter` (`/usr/local/bin/node_exporter`, listening on `<PROD_VPS_IP>:9100`, scraped by the Monitoring/Admin VPS `<BACKUP_VPS_IP>`) is installed on this VPS.
     - **Grafana, Prometheus, Loki, Promtail, and Grafana Alloy are NOT installed on the production VPS** (`<PROD_VPS_IP>`). The central monitoring dashboard (`https://monitor.acya.site/dashboard`) is hosted on the separate Administration/Monitoring VPS (`<BACKUP_VPS_IP>`).
5. **Evidence:**
   ```text
   $ sudo cat /etc/docker/daemon.json
   No /etc/docker/daemon.json

   $ sudo docker info --format 'LoggingDriver: {{.LoggingDriver}}'
   LoggingDriver: json-file

   /elance-app-ui | Driver: json-file | Opts: {} | Size: 292K
   /admin-elance-front | Driver: json-file | Opts: {} | Size: 1.6K
   /wood-app-api | Driver: json-file | Opts: {} | Size: 14M
   /admin-elance-back | Driver: json-file | Opts: {} | Size: 35M
   /acya-restore-n8n-pg | Driver: json-file | Opts: {} | Size: 7.4K
   /acya-restore-test-pg | Driver: json-file | Opts: {} | Size: 9.6K
   /n8n | Driver: json-file | Opts: {"max-file":"5","max-size":"50m"} | Size: 93K
   /postgres-n8n | Driver: json-file | Opts: {"max-file":"3","max-size":"20m"} | Size: 1.2M
   /8cdff3364501_wood-app-postgres | Driver: json-file | Opts: {} | Size: 738K
   ```
6. **Root Cause:**
   While [docker-compose.n8n.yml](file:///home/ubuntu/acya-app/docker-compose.n8n.yml) explicitly specifies `logging: driver: json-file` with `max-size` and `max-file` options, [docker-compose.yml](file:///home/ubuntu/acya-app/docker-compose.yml) omits `logging:` blocks and `/etc/docker/daemon.json` is absent.Notice that `admin-elance-back` accumulated **35 MiB** and `wood-app-api` accumulated **14 MiB** of JSON logs in just **22 hours** since their last container recreation (~50 MiB/day combined).
7. **Production Impact:**
   - At ~50 MiB/day for `admin-elance-back` and `wood-app-api`, unbounded container logs will grow to ~1.5 GiB/month and can gradually exhaust disk space over long uptimes (`8cdff3364501_wood-app-postgres` has been up for 2 months without recreation).
   - **Resource Overhead Evaluation for Centralized Docker Logging:**
     - **Available Host Resources:** 6 vCPUs (Haswell, load average `0.43, 0.37, 0.17`), `7.1 GiB` available RAM (out of `11.4 GiB`), `72 GiB` available disk space.
     - **Option 1 (Lightweight Agent Shipper — Grafana Alloy or Promtail on `<PROD_VPS_IP>` shipping to Loki on Monitoring VPS `<BACKUP_VPS_IP>`):**
       - **CPU Overhead:** ~0.5% to 1.5% of 1 vCPU (tailing 9 container log files and Nginx logs).
       - **RAM Overhead:** ~45–80 MiB RSS for Promtail or ~80–130 MiB RSS for Grafana Alloy.
       - **Disk Overhead:** Negligible (~10–20 MiB binary + positions file; relies on rotated Docker `json-file` logs capped at e.g. `50m x 3` = 150 MiB per container, max ~1.2 GiB total on disk).
     - **Option 2 (Hosting Full Loki + Grafana Stack Locally on Production VPS `<PROD_VPS_IP>`):**
       - **Not Recommended:** Running Loki + Prometheus + Grafana on the production VPS would consume an extra ~600 MiB–1.2 GiB RAM, additional disk I/O for chunk/TSDB compaction, and violate the existing separation of concerns where `<BACKUP_VPS_IP>` (`monitor.acya.site`) serves as the dedicated Monitoring & Storage VPS.
8. **Recommended Correction:**
   - Add `logging: driver: json-file` with `options: { max-size: "50m", max-file: "3" }` to all services in [docker-compose.yml](file:///home/ubuntu/acya-app/docker-compose.yml) (and configure `/etc/docker/daemon.json` with default `"log-driver": "json-file"`, `"log-opts": {"max-size": "50m", "max-file": "3"}` for future containers).
   - For centralized log shipping, deploy a lightweight log shipper (Grafana Alloy or Promtail) restricted by systemd (`MemoryMax=150M`, `CPUQuota=15%`) that tails `/var/lib/docker/containers/*/*-json.log` and `/var/log/nginx/*.log` and pushes to Loki on `<BACKUP_VPS_IP>` over encrypted transport or WireGuard.
9. **Dependencies That Must Be Preserved:**
   - Do **not** restart `docker.service` daemon during business hours, as restarting `docker.service` restarts all running containers including `8cdff3364501_wood-app-postgres`. Per-service `logging:` options in `docker-compose.yml` can be applied during targeted `docker compose up -d --no-deps <service>` updates without restarting the Docker daemon or PostgreSQL.
10. **Risk Level:** **LOW**
11. **Rollback Procedure:**
    Remove the `logging:` block from `docker-compose.yml` or `/etc/docker/daemon.json`.

---

### FINDING-09 — Absence of Prometheus Metrics Exporters in ASP.NET Core APIs & Next.js Frontends and Missing Docker Healthchecks on 3 of 4 App Containers

1. **Finding ID:** `FINDING-09`
2. **Severity:** **MEDIUM**
3. **Classification:** **CONFIRMED**
4. **Current Configuration:**
   - **Existing Health Endpoints:**
     1. **`wood-app-api` (.NET 7):**
        - Endpoint: `GET /api/ApiHealth/HealthCheck` in [ApiHealthController.cs](file:///home/ubuntu/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/ApiHealthController.cs#L27-L58).
        - Behavior: Executes `_context.Database.CanConnectAsync()` and returns `200 OK` `{"status":"Healthy","database":"Connected"}` or `503 ServiceUnavailable`.
        - Docker Healthcheck: Configured in [wood-app.api/Dockerfile](file:///home/ubuntu/acya-app/wood-app.api/Dockerfile) (`curl -f http://localhost:80/api/ApiHealth/HealthCheck || exit 1`, interval 30s, timeout 10s, retries 3).
     2. **`admin-elance-back` (.NET 8):**
        - Endpoint: `GET /api/admin/Health/services` in [HealthController.cs](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/HealthController.cs#L45-L86).
        - Behavior: Protected by `[Authorize(Roles = "SUPER_ADMIN")]` (returns `401 Unauthorized` to unauthenticated probes). When called by an authenticated SuperAdmin, it probes `http://elance-app-ui:3000` and `http://wood-app-api:80/api/ApiHealth/HealthCheck` with a 5s timeout and reports latency and `UP`/`DEGRADED`/`DOWN` status.
        - Docker Healthcheck: **`null` (None configured)** — no anonymous `/health` endpoint exists on `admin-elance-back`.
     3. **`elance-app-ui` (Next.js 16.2):**
        - No dedicated `/api/health` route exists (only `/api/print-locale/route.ts`). Root `GET /` returns `200 OK` (`253 KB` prerendered HTML).
        - Docker Healthcheck: **`null` (None configured)**.
     4. **`admin-elance-front` (Next.js 16.2):**
        - No dedicated `/api/health` route exists. Root `GET /` returns `200 OK` (`7.3 KB` prerendered HTML).
        - Docker Healthcheck: **`null` (None configured)**.
     5. **`acya-scheduler-daemon` (Host Python Daemon on port `9095`):**
        - Endpoint: `GET http://127.0.0.1:9095/health` (unauthenticated) returns `200 OK` `{"status": "ok", "service": "acya-scheduler-daemon"}`.
   - **Existing Prometheus Exporters & Application Metrics:**
     - **Host Level:** `node_exporter` is running on `<PROD_VPS_IP>:9100` and actively scraped by `<BACKUP_VPS_IP>` (`1,724,838` packets in `iptables INPUT`).
     - **Application Level:** Neither `ms.webapp.api.acya.csproj` (.NET 7) nor `ms.admin.api.acya.csproj` (.NET 8) includes `prometheus-net.AspNetCore` or `OpenTelemetry.Exporter.Prometheus.AspNetCore`. Neither Next.js application (`elance-app.ui`, `admin-elance-front`) includes `prom-client` or `@vercel/otel`. No `/metrics` endpoint exists on any of the 4 application containers.
5. **Evidence:**
   ```text
   $ curl -s -i http://127.0.0.1:8080/api/ApiHealth/HealthCheck
   HTTP/1.1 200 OK
   Content-Type: application/json; charset=utf-8
   {"status":"Healthy","database":"Connected"}

   $ curl -s -i http://127.0.0.1:8082/api/admin/Health/services
   HTTP/1.1 401 Unauthorized
   WWW-Authenticate: Bearer

   $ sudo docker inspect --format '{{.Name}}: {{json .Config.Healthcheck}}' wood-app-api admin-elance-back elance-app-ui admin-elance-front
   /wood-app-api: {"Test":["CMD-SHELL","curl -f http://localhost:80/api/ApiHealth/HealthCheck || exit 1"],"Interval":30000000000,"Timeout":10000000000,"StartPeriod":40000000000,"Retries":3}
   /admin-elance-back: null
   /elance-app-ui: null
   /admin-elance-front: null
   ```
6. **Root Cause:**
   Observability was implemented first at the infrastructure level (`node_exporter` on `<PROD_VPS_IP>:9100`) and via a basic DB connectivity endpoint (`/api/ApiHealth/HealthCheck` in `wood-app-api`) plus an authenticated Backoffice aggregation endpoint (`/api/admin/Health/services`), without instrumenting ASP.NET Core Kestrel/HTTP request pipelines or Next.js Node.js runtimes for Prometheus scraping.
7. **Production Impact:**
   - Prometheus on `<BACKUP_VPS_IP>` has visibility into host CPU/RAM/disk via `node_exporter:9100`, but zero visibility into:
     - Per-endpoint HTTP request rates, p95/p99 latencies, and 4xx/5xx error rates in `wood-app-api` and `admin-elance-back`.
     - .NET GC heap generations, threadpool starvation, EF Core/Npgsql connection pool saturation, or background hosted service health (`NotificationRetryService`, `AuditCleanupBackgroundService`, `QuoteEmailRecoveryBackgroundService`, `BillingReminderBackgroundService`, `SaaSLifecycleScheduler`).
     - Per-container CPU/memory metrics (`cAdvisor` or Docker metrics) and Next.js Node.js event loop lag / heap usage.
8. **Recommended Correction (Integration Architecture):**
   - **ASP.NET Core (`wood-app-api` .NET 7 & `admin-elance-back` .NET 8):**
     - Integrate `prometheus-net.AspNetCore` (or OpenTelemetry Prometheus exporter) to expose `app.UseHttpMetrics()` and `app.MapMetrics("/metrics")`.
     - Add an unauthenticated, lightweight `GET /api/admin/Health/ping` (or `app.MapHealthChecks("/health")`) to `admin-elance-back` so Docker can run a container healthcheck without requiring a `SUPER_ADMIN` JWT.
     - **CRITICAL MULTI-TENANT GUARD FOR `wood-app-api`:** Ensure `TenantMiddleware` in [Program.cs](file:///home/ubuntu/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Program.cs#L104-L107) bypasses tenant resolution for `/metrics` and `/api/ApiHealth/HealthCheck` (or map `/metrics` before `TenantMiddleware`), and **never** use raw request path IDs or high-cardinality user/document IDs as Prometheus labels.
   - **Next.js (`elance-app-ui` & `admin-elance-front`):**
     - Add a lightweight `GET /api/health` route handler returning `200 OK` `{"status":"ok"}` for Docker healthchecks.
     - Expose Node.js runtime metrics (event loop lag, heap usage, active handles) via `prom-client` on an internal-only endpoint or scrape container-level resource metrics via `cAdvisor` / Grafana Alloy.
   - **Reverse Proxy & Security for `/metrics`:**
     - **NEVER expose `/metrics` publicly on `acya.site`, `*.acya.site`, or `admin.acya.site` in Nginx.** Either:
       1. Block `/metrics` in public Nginx `server` blocks (`location = /metrics { return 404; }`) and expose `/metrics` only via a dedicated internal Nginx listener bound to `<PROD_VPS_IP>` / WireGuard restricted by `iptables` to `<BACKUP_VPS_IP>` (matching `node_exporter:9100`), **or**
       2. Have a local Grafana Alloy agent on `<PROD_VPS_IP>` scrape `http://127.0.0.1:8080/metrics` and `http://127.0.0.1:8082/metrics` over loopback and `remote_write` to Prometheus on `<BACKUP_VPS_IP>`.
9. **Dependencies That Must Be Preserved:**
   - `admin-elance-back`'s `HealthController` probes `http://wood-app-api:80/api/ApiHealth/HealthCheck` and `http://elance-app-ui:3000`. These internal URLs and response contracts must remain unchanged.
   - `TenantMiddleware` isolation in `wood-app-api`.
10. **Risk Level:** **LOW**
11. **Rollback Procedure:**
    Revert `.csproj` / `Program.cs` changes and rebuild only the modified container via `sudo docker compose build --no-cache <service> && sudo docker compose up -d --no-deps <service>`.

---

## Prioritized Remediation Plan

> [!IMPORTANT]
> **Execution Gate:** Per mission instructions, **NO changes have been applied**. The following 5-phase remediation plan is designed for minimal risk, zero tenant data impact, and full rollback capability once explicitly reviewed and approved.

---

### PHASE A — Docker Port Exposure and Firewall Hardening (Priority 1 — Immediate Security Fix)

1. **Pre-Flight Check:**
   - Confirm `/etc/hosts` maps `localhost` to `127.0.0.1` so Nginx `proxy_pass http://localhost:8080` (and `5000`, `5002`, `8082`) connects over IPv4 `127.0.0.1`.
   - Backup `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`.
2. **Step A.1 — Immediate Zero-Downtime Firewall Shield (`DOCKER-USER` & `ip6tables`):**
   - Add rules in `iptables` `DOCKER-USER` dropping any inbound packets from public interface `ens3` targeting the published container ports (`-i ens3 -p tcp -m conntrack --ctorigdstport 5000,5002,8080,8082 -j DROP`).
   - Add rules in `ip6tables` `INPUT` and `DOCKER-USER` dropping inbound packets from `ens3` to ports `5000`, `5002`, `8080`, `8082`, `9095`, and `9100`.
3. **Step A.2 — Bind Published Ports to `127.0.0.1` in `docker-compose.yml`:**
   - Update `docker-compose.yml` port mappings:
     - `api`: `"127.0.0.1:8080:80"`
     - `elance-app-ui`: `"127.0.0.1:5000:3000"`
     - `admin-api`: `"127.0.0.1:8082:80"`
     - `admin-ui`: `"127.0.0.1:5002:3000"`
   - Apply one service at a time using the safe targeted workflow:
     ```bash
     sudo docker compose up -d --no-deps api
     sudo docker compose up -d --no-deps elance-app-ui
     sudo docker compose up -d --no-deps admin-api
     sudo docker compose up -d --no-deps admin-ui
     ```
   - Verify `sudo ss -tulnp` shows `127.0.0.1:5000`, `127.0.0.1:5002`, `127.0.0.1:8080`, `127.0.0.1:8082` (and no `[::]:5000..8082` listeners), and verify `https://acya.site`, `https://admin.acya.site`, and `https://n8n.acya.site` return `200 OK`.
4. **Step A.3 — Host Perimeter Firewall Hardening (`rules.v4` & `rules.v6`):**
   - Configure explicit allow rules on `INPUT` for `lo`, `wg0`, `RELATED,ESTABLISHED`, ICMP/ICMPv6, TCP `22`, `80`, `443`, UDP `49299` (WireGuard), TCP `9100` (`<BACKUP_VPS_IP>`), and TCP `9095` (`lo`, `172.18.0.0/16`, `<BACKUP_VPS_IP>`), followed by a drop rule on `-i ens3`.
   - Persist via `netfilter-persistent save`.

---

### PHASE B — Persistent 4 GB Swap Allocation (Priority 2 — Memory Stability Cushion)

1. **Step B.1 — Allocate and Enable 4 GiB `/swapfile`:**
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```
2. **Step B.2 — Persist in `/etc/fstab` & Tune `vm.swappiness`:**
   - Append `/swapfile none swap sw 0 0` to `/etc/fstab`.
   - Create `/etc/sysctl.d/99-acya-memory.conf` with `vm.swappiness = 10` and apply with `sudo sysctl --system`.
3. **Step B.3 — Verification:**
   - Confirm `free -h` shows `4.0Gi` swap and `/proc/meminfo` shows `CommitLimit` (~9.7 GiB) > `Committed_AS` (~7.55 GiB).

---

### PHASE C — Restic Backup Repair & Lock Hygiene (Priority 1 — Data Protection Recovery)

1. **Step C.1 — Re-Authorize Repository Writes for Daily Timer:**
   - Edit `/opt/acya-backup/config/backup.json` (`0600 root:root`) to set `"repositoryWritesAuthorized": true`.
2. **Step C.2 — Clear Historical Stale Shared Locks (Optional / Operator-Authorized):**
   - Execute one-time `restic unlock` using the `/etc/acya-backup/` credentials to remove the 4 dead shared locks from `2026-10-13` (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`), then verify with `sudo /opt/acya-backup/bin/acya-backup-lock-inspect --config /opt/acya-backup/config/backup.json`.
3. **Step C.3 — Execute Controlled Full Backup & Refresh Tenant Catalog:**
   - Trigger `sudo systemctl start acya-backup-runner.service`.
   - Verify `last-run.json` and `last-success.json` record `outcome: "success"` and a new snapshot ID (snapshot #7).
   - Run `sudo /opt/acya-backup/bin/acya-backup-history --config /opt/acya-backup/config/backup.json` to update `/opt/acya-backup/state/tenant-backup-history.json`.
4. **Step C.4 — Decommission Legacy Phase 16C Path Watcher:**
   - Disable `acya-backup-sync.path` (`sudo systemctl disable --now acya-backup-sync.path`) so the legacy `/usr/local/bin/acya-production-backup.sh` timer cannot be accidentally re-enabled.

---

### PHASE D — Centralized Docker Logging & Log Rotation (Priority 3 — Disk Protection & Observability)

1. **Step D.1 — Enforce Bounded `json-file` Rotation in `docker-compose.yml`:**
   - Add `logging: driver: json-file` with `options: { max-size: "50m", max-file: "3" }` to `postgres`, `api`, `elance-app-ui`, `admin-api`, and `admin-ui` in `docker-compose.yml` (can be combined with Phase A.2 container recreation for the 4 app containers so containers are only recreated once).
   - Create `/etc/docker/daemon.json` with default `json-file` rotation (`max-size: "50m"`, `max-file: "3"`) without restarting `docker.service`.
2. **Step D.2 — Lightweight Log Shipper to Monitoring VPS (`<BACKUP_VPS_IP>`):**
   - Install Grafana Alloy (or Promtail) as a resource-capped systemd service (`MemoryMax=150M`, `CPUQuota=15%`) on `<PROD_VPS_IP>` to ship Docker container logs and `/var/log/nginx/*.log` to Loki on `<BACKUP_VPS_IP>`.

---

### PHASE E — ASP.NET Core and Next.js Prometheus Metrics & Healthchecks (Priority 4 — Application Telemetry)

1. **Step E.1 — Add Unauthenticated Health Endpoints & Docker Healthchecks:**
   - Add anonymous `GET /api/admin/Health/ping` to `admin-elance-back` and `GET /api/health` to `elance-app-ui` and `admin-elance-front`, and add `HEALTHCHECK` instructions to their Dockerfiles.
2. **Step E.2 — Instrument ASP.NET Core APIs with Prometheus Metrics:**
   - Add `prometheus-net.AspNetCore` to `wood-app-api` (.NET 7) and `admin-elance-back` (.NET 8).
   - Register `app.UseHttpMetrics()` and `app.MapMetrics("/metrics")` (ensuring `TenantMiddleware` in `wood-app-api` skips `/metrics` and `/api/ApiHealth/HealthCheck`).
3. **Step E.3 — Secure Metrics Scraping:**
   - Block `/metrics` on all public Nginx virtual hosts (`location = /metrics { return 404; }`).
   - Scrape `127.0.0.1:8080/metrics` and `127.0.0.1:8082/metrics` via Grafana Alloy (or an internal Nginx proxy port restricted by `iptables` to `<BACKUP_VPS_IP>`).
