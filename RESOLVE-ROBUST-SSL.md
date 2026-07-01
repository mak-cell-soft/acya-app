# Implementation Plan - Robust SSL Provisioning for ACYA SaaS

This plan details the diagnosis of the SSL provisioning failures on the ACYA platform and outlines two paths to achieve a stable, automated, and robust HTTPS configuration for all tenants.

## 🔍 Diagnosis & Root Cause Analysis

We have analyzed the current DNS, Nginx configuration, Certbot certificate list, and cron logs. Here is the breakdown of the current system's issues:

1. **Certificate Lineage Mismatch (Primary Bug)**:
   - Nginx is statically configured in `/etc/nginx/sites-available/default` to load `/etc/letsencrypt/live/acya.site/fullchain.pem`.
   - The cron job script `/home/ubuntu/acya-app/scripts/sync_ssl.sh` runs `certbot` using `--expand` without specifying a target certificate name via `--cert-name acya.site`.
   - Because of this, when new domains are added, Certbot creates **new separate certificate lineages** (e.g., `acya.site-0001` through `acya.site-0008`) instead of expanding the primary `acya.site` lineage.
   - The latest certificate containing all domains is `acya.site-0008` (containing newer subdomains like `fleur-de-printemps.acya.site` and `mansour-construction.acya.site`), but Nginx is still loading the original `acya.site` certificate.
   - Consequently, visitors of newer subdomains receive browser SSL errors (e.g., `SSL: no alternative certificate subject name matches target hostname 'fleur-de-printemps.acya.site'`).

2. **Certbot Skipping Expansions**:
   - Because the latest lineage `acya.site-0008` already contains all currently active domains and is valid (expiring in ~88 days), Certbot runs with `--keep-until-expiring` and logs `Certificate not yet due for renewal; no action taken.`
   - This prevents Nginx from ever loading those domains correctly under the original path, and keeps the system stuck in this state.

3. **Inherent Architectural Scaling Limits**:
   - Let's Encrypt certificates have a **limit of 100 Subject Alternative Names (SANs)**. The current script attempts to bundle all tenants into a single certificate. Once ACYA grows beyond ~97 tenants, it will be impossible to add more.
   - Constantly requesting new certificates for the root domain + all subdomains hits Let's Encrypt rate limits (e.g., 50 duplicate certificates per week, failed validation limits).

---

## 🛠️ Proposed Solutions

### Option A: Wildcard SSL Certificate via `acme-dns` DNS-01 Challenge (Recommended)

Instead of renewing or expanding certificates for every single tenant, we configure a single wildcard certificate (`*.acya.site` and `acya.site`) that covers all current and future subdomains automatically.

Since the DNS provider is Namecheap (which has a strict XML API requiring whitelisting server IPs and manual account setup), we will use **`acme-dns`** (via the public `auth.acme-dns.io` server or a self-hosted instance). 
This requires the user to add **only one CNAME record once** in their Namecheap DNS console. After that, renewals are 100% automated, and tenant creation is instant.

#### How Option A Works:
1. **acme-dns Setup**:
   - Download the `acme-dns-auth.py` script and place it in `/etc/letsencrypt/`.
   - Run a register command to generate credentials and a target DNS host (e.g., `_acme-challenge.acya.site` -> `xxxx.auth.acme-dns.io`).
2. **Manual DNS Configuration**:
   - The user creates a CNAME record: `_acme-challenge.acya.site` pointing to the generated target.
3. **Wildcard Generation**:
   - Request a wildcard certificate covering `acya.site` and `*.acya.site` using the `acme-dns` auth hook.
4. **Nginx Integration**:
   - Point Nginx `/etc/nginx/sites-available/default` and `drop-unknown` to use the primary `acya.site` wildcard certificate.
5. **Cleanup**:
   - Remove/disable the 2-minute cron job since new tenants will work immediately without any new certificates or reloads!
   - Delete the old unused `acya.site-0001` through `acya.site-0008` lineages.

---

### Option B: Robust HTTP-01 Tenant-by-Tenant SSL Provisioning (No DNS Changes)

If the user cannot or does not want to configure a CNAME record, we keep using the HTTP-01 challenge, but completely redesign the provisioning flow to isolate tenants.

#### How Option B Works:
1. **Separate Nginx Virtual Hosts**:
   - Instead of a single regex server block, we generate a separate virtual host file `/etc/nginx/sites-available/<slug>.acya.site.conf` for each tenant.
2. **Isolated Certificates**:
   - Run Certbot specifically for `<slug>.acya.site` to generate an isolated certificate. This avoids the 100-domain limit and prevents one tenant's failure from affecting others.
3. **Automated Hook / Cron Script**:
   - Write a robust shell script (`provision_tenant_ssl.sh`):
     - **DNS Verification**: Perform a local query to check if the subdomain's DNS resolves to the server IP. If not, it retries/backs off (avoiding Certbot failed validation limits).
     - **Certbot Execution**: Requests a certificate solely for the tenant.
     - **Nginx Setup & Reload**: Creates the configuration file, enables it, tests configuration (`nginx -t`), reloads Nginx, and implements a rollback on failure.
   - Expose this script via a backend webhook or a frequent cron monitoring a database state (e.g., a new column `ssl_status` in the DB).

---

## ❓ Open Questions for the User

> [!IMPORTANT]
> Please review these questions and provide your response:
> 1. **Do you prefer Option A (Wildcard SSL via a one-time CNAME setup) or Option B (Tenant-by-tenant SSL provisioning with no DNS changes)?** 
>    *Note: Option A is strongly recommended for scalability, simplicity, and performance.*
> 2. If choosing Option A: Are you able to access your Namecheap DNS panel to add a single CNAME record for `_acme-challenge.acya.site` when prompted?
> 3. Do you have a preferred email address to receive Let's Encrypt certificate expiration/renewal alerts (currently using `admin@acya.site`)?

---

## 📋 Proposed Changes (Option A - Wildcard SSL via `acme-dns`)

### Nginx

#### [MODIFY] [default](file:///etc/nginx/sites-available/default)
- Update Nginx virtual hosts to load the wildcard certificate lineage.
- Keep the regex block but ensure it cleanly serves SSL using the wildcard certificate.

#### [MODIFY] [drop-unknown](file:///etc/nginx/sites-available/drop-unknown)
- Ensure the default server uses the wildcard certificate.

### Scripts & Crontabs

#### [NEW] [acme-dns-auth.py](file:///etc/letsencrypt/acme-dns-auth.py)
- Download and place the python authenticator script.

#### [DELETE] [/home/ubuntu/acya-app/scripts/sync_ssl.sh](file:///home/ubuntu/acya-app/scripts/sync_ssl.sh)
- Delete the old scaling-limited sync script.

#### [MODIFY] crontabs
- Remove the 2-minute root crontab job.
- Rely on the standard Certbot systemd timer/cron for automatic renewals (which runs `certbot renew` and reloads Nginx via a post-hook).

---

## 📋 Proposed Changes (Option B - HTTP-01 Tenant-by-Tenant)

### Nginx

#### [NEW] [tenant_template.conf](file:///etc/nginx/sites-available/templates/tenant.conf)
- Template file for generating Nginx server blocks dynamically.

### Scripts & Backend

#### [NEW] [provision_tenant_ssl.sh](file:///home/ubuntu/acya-app/scripts/provision_tenant_ssl.sh)
- Robust script to verify DNS, request tenant-specific certificate, write Nginx vhost, reload, and rollback if needed.

#### [MODIFY] [sync_ssl.sh](file:///home/ubuntu/acya-app/scripts/sync_ssl.sh)
- Update the cron script to iterate over active tenants and run `provision_tenant_ssl.sh` for any missing certificates/configs, instead of expanding a single giant certificate.

---

## ✅ Verification Plan

### Automated/Scripted Verification
- Run Certbot in dry-run mode to verify the DNS-01 or HTTP-01 challenge.
- Validate Nginx config syntax using `sudo nginx -t`.
- Verify DNS resolution for subdomains.

### Manual Verification
- Access `https://fleur-de-printemps.acya.site/` and verify that the SSL certificate is valid and is no longer returning domain mismatch errors.
- Provision a new tenant via the BackOffice (or via the test provisioning script `test_provisioning.sh`) and verify that the new subdomain becomes immediately accessible over HTTPS.
