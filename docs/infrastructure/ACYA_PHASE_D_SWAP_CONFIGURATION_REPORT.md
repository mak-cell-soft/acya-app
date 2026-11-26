# ACYA PRODUCTION — PHASE D: SWAP CONFIGURATION REPORT

- **Execution Date:** `2026-11-25` (`10:35:25Z` – `10:37:02Z`)
- **Production Host:** `<PROD_VPS_HOSTNAME>` (`<PROD_VPS_IP>`)
- **Scope Executed:** **Phase D ONLY** (Creation, activation, and persistence of a 4 GiB `/swapfile` and `vm.swappiness = 10`)
- **Docker / PostgreSQL / Nginx / Firewall / Restic / Reboot Changes:** **NONE (0)**
- **Rollback Status:** **Not required** (All preflight, activation, persistence, and post-execution health checks passed)

---

## 1. Initial Memory and Swap State

Verified via read-only preflight prior to making any changes:
- **`free -h`:** `Mem: 11Gi total, 3.9Gi used, 373Mi free, 801Mi shared, 8.2Gi buff/cache, 7.5Gi available` | `Swap: 0B total, 0B used, 0B free`
- **`swapon --show` / `/proc/swaps`:** Empty (zero swap configured)
- **`sysctl vm.swappiness`:** `vm.swappiness = 60`
- **`/proc/meminfo`:**
  - `MemTotal`: `11,956,072 kB` (~11.40 GiB)
  - `MemAvailable`: `7,852,372 kB` (~7.49 GiB)
  - `SwapTotal`: `0 kB`
  - `CommitLimit`: `5,978,036 kB` (~5.70 GiB)
  - `Committed_AS`: `7,260,700 kB` (~6.92 GiB — previously exceeding `CommitLimit`)
- **Memory Pressure (`/proc/pressure/memory`):** `some avg10=0.00 avg60=0.00 avg300=0.00`, `full avg10=0.00 avg60=0.00 avg300=0.00`
- **Pre-Existence Checks:** Confirmed `/swapfile` did not exist, `/etc/fstab` had no swap entry, and `/etc/sysctl.conf` / `/etc/sysctl.d/` had no swappiness configuration or `99-acya-swap.conf`.

---

## 2. Filesystem and Disk Checks

- **Root Filesystem (`findmnt /`):** `/dev/sda1`, type **`ext4`** (`rw,relatime,discard,errors=remount-ro,commit=30`).
- **Disk Capacity Before (`df -h /`):** `96G` total, `25G` used (`26%`), **`72G` available**.

---

## 3. Backup Location

- **Backup Directory:** `/root/acya-remediation-backups/phase-d-20261125-103600Z/` (`0700 root:root`)
- **Files Preserved:**
  - `fstab.bak` (`0644 root:root`, `146` bytes — exact copy of original `/etc/fstab`)
  - `swappiness.pre.txt` (`60`)
  - `proc_swaps.pre.txt` (empty header)
  - `free.pre.txt`
  - `df.pre.txt`

---

## 4. Swap File Creation Details & Final Permissions

- **Creation Method:** Physical, non-sparse allocation with no-clobber guard (`conv=excl`) on `ext4`:
  ```bash
  sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 conv=excl status=none
  sudo chmod 0600 /swapfile
  sudo chown root:root /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```
- **Verification (`stat /swapfile`):**
  - **Size:** `4,294,967,296` bytes (`4.0 GiB`)
  - **Allocated Blocks:** `8,388,616` 512-byte blocks (`4,294,971,392` bytes physically allocated — confirmed **non-sparse**)
  - **Permissions & Ownership:** **`0600` (`-rw-------`), `root:root`**
  - **Swap UUID:** `56e4dff2-fc7d-416f-8a21-41a0c80b5757`

---

## 5. Final Swappiness Value

- **Dedicated Sysctl File:** `/etc/sysctl.d/99-acya-swap.conf` (`0644 root:root`, `19` bytes):
  ```ini
  vm.swappiness = 10
  ```
- **Applied via:** `sudo sysctl --system`
- **Verified Runtime Value (`sysctl vm.swappiness`):** **`vm.swappiness = 10`**

---

## 6. Persistent `/etc/fstab` Entry & Validation

- **Final `/etc/fstab` (`0644 root:root`, `173` bytes):**
  ```fstab
  LABEL=cloudimg-rootfs	/	 ext4	discard,commit=30,errors=remount-ro	0 1
  LABEL=BOOT	/boot	ext4	defaults	0 2
  LABEL=UEFI	/boot/efi	vfat	umask=0077	0 1
  /swapfile none swap sw 0 0
  ```
- **Entry Count (`grep -c '^/swapfile[[:space:]]' /etc/fstab`):** `1`
- **`sudo findmnt --verify`:** `0 parse errors, 0 errors, 2 warnings` (standard informational warnings: non-bind mount source `/swapfile` is a regular file, and systemd fstab generator notice).

---

## 7. `swapon --show` & Post-Execution Memory / Disk Evidence

```text
$ swapon --show
NAME      TYPE SIZE USED PRIO
/swapfile file   4G   0B   -2

$ free -h
               total        used        free      shared  buff/cache   available
Mem:            11Gi       3.9Gi       226Mi       801Mi       8.4Gi       7.5Gi
Swap:          4.0Gi          0B       4.0Gi

$ grep -E "MemTotal|MemAvailable|SwapTotal|SwapFree|CommitLimit|Committed_AS" /proc/meminfo
MemTotal:       11956072 kB
MemAvailable:    7845636 kB
SwapTotal:       4194300 kB
SwapFree:        4194300 kB
CommitLimit:    10172336 kB
Committed_AS:    7260776 kB

$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        96G   29G   68G  30% /
```

- `CommitLimit` increased from `5.70 GiB` to **`9.70 GiB`** (now comfortably above `Committed_AS` at `6.92 GiB`).
- Root filesystem `/` retains **`68 GiB` free (`30%` used)** — well above the `5.0 GiB` backup staging minimum.

---

## 8. Docker, PostgreSQL, and Public Application Health Checks

- **All 9 Docker Containers:** Running continuously with zero restarts caused by Phase D (`wood-app-api` `Up 23 minutes (healthy)`, `8cdff3364501_wood-app-postgres` `Up 2 months (healthy)`, `postgres-n8n` `Up 2 months (healthy)`, `n8n` `Up 13 days`).
- **PostgreSQL Readiness:**
  - `8cdff3364501_wood-app-postgres`: `/var/run/postgresql:5432 - accepting connections`
  - `postgres-n8n`: `/var/run/postgresql:5432 - accepting connections`
- **Public Domains & Core API:**
  - `https://acya.site/api/ApiHealth/HealthCheck` -> `HTTP 200` (`{"status":"Healthy","database":"Connected"}`)
  - `https://piqbit.acya.site/` -> `HTTP 200`
  - `https://socobois.acya.site/` -> `HTTP 200`
  - `https://admin.acya.site/` -> `HTTP 200`

---

## 9. Rollback Status

- **Rollback Status:** **Not required.**
- **Backup Preserved At:** `/root/acya-remediation-backups/phase-d-20261125-103600Z/`.

---

## 10. Warnings & Completion Notice

1. **`findmnt --verify` Informational Notice:** `findmnt --verify` noted `your fstab has been modified, but systemd still uses the old version; use 'systemctl daemon-reload' to reload`. Since `/swapfile` is already active via `swapon /swapfile` and will be mounted automatically by systemd on any future reboot, no `systemctl daemon-reload` or reboot was required.
2. **Subsequent Phases Not Started:** Execution has **stopped after Phase D**. Phases B (firewall hardening), E (legacy backup watcher), and F (Docker log rotation/monitoring) remain untouched and await separate explicit authorization.
