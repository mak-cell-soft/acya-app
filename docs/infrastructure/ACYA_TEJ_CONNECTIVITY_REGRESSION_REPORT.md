# ACYA Élancé — TEJ Connectivity Regression Report

**Mode:** read-only. **Investigation window:** 2026-11-17 13:57Z – 15:35Z.
**Confidence scale:** CONFIRMED (direct evidence) · HIGH CONFIDENCE (several independent observations) · PROBABLE (supported, alternatives remain) · UNKNOWN.

> This report supersedes the first report (`ACYA_TEJ_AUTHENTICATION_INVESTIGATION.md`) where they differ. See §9.3 for the corrections.

---

## 1. Executive Summary

| # | Conclusion | Confidence |
|---|---|---|
| 1 | TEJ **did work from this production environment**. Seventeen holding-tax records saved with the description "Retenue à la source TEJ" exist for tenant `socofeb` between 2026-08-07 and 2026-10-02 10:50 UTC. The code writes that description only after the TEJ call succeeds. | CONFIRMED (code path) / HIGH (that each row is a real TEJ success) |
| 2 | **The application has never contained a proxy.** No revision of the repo, the Compose file or the `.env` key list mentions a proxy for TEJ. The June SOCKS5 plan (`SOL-TEJ-SSH.md`) was never implemented. TEJ therefore worked through **direct egress**. | HIGH CONFIDENCE |
| 3 | **Direct egress to the TEJ servers now fails.** TCP to `41.225.7.188:443` times out from the host and from the API container. The host has no outbound filter (`OUTPUT ACCEPT`) and a normal default route. | CONFIRMED |
| 4 | **No TEJ code or infrastructure change explains the failure.** No TEJ-related commit exists after 2026-06-18. No proxy or Compose change touched the TEJ path. The API container was recreated on 2026-11-11 with unchanged TEJ settings. | HIGH CONFIDENCE |
| 5 | The failure is therefore most likely **upstream of our host** (remote-side or transit filtering of this VPS's address or range). That cause is **PROBABLE and not proven**. | PROBABLE |
| 6 | **Port 10808 is not a production tunnel.** It is a loopback-only listener created by each interactive SSH login (a new `sshd-session` PID on every login), and it vanishes when the session ends. Containers cannot reach it. | CONFIRMED |
| 7 | **TEJ never rejected the credentials.** The request never gets an answer. The UI shows "Mot de passe TEJ incorrect" because of a frontend fallback. | CONFIRMED |
| 8 | **Nothing was found that can be "restored".** No earlier proxy or tunnel setup exists on this host. The question is why direct egress stopped working. | HIGH CONFIDENCE |

**Recommendation:** do not build a proxy yet. First get two pieces of evidence: (a) whether TEJ or the Tunisian network operators now filter the VPS address `51.210.10.108`, and (b) a TCP test to TEJ from a second, non-OVH host. See §13 and §16.

---

## 2. Historical Timeline

| Event | Date / time | Evidence | Level |
|---|---|---|---|
| TEJ integration first committed | 2026-06-16 | commit `5fed98d4` | CONFIRMED |
| `SOL-TEJ-SSH.md` written. It says auth and beneficiary lookups worked from the VPS, and batch upload failed. | 2026-06-18 | commit `c694b226` (doc only) | CONFIRMED |
| Last backend TEJ code change | 2026-06-18 | commit `515e4232`; `git log` on the `tej` folders | CONFIRMED |
| First saved TEJ-origin record | 2026-08-07 06:33 UTC | `tenant_socofeb.tbl_holding_tax` id 1 | CONFIRMED (row), HIGH (TEJ success) |
| Last saved TEJ-origin record = **last known successful TEJ operation** | **2026-10-02 10:50:16 UTC** | id 21; 17 rows with that description between Aug 7 and Oct 2 | CONFIRMED (row), HIGH (TEJ success) |
| Host last rebooted | 2026-07-08 20:20 | `who -b`, `journalctl --list-boots` | CONFIRMED. It predates the successes, so a reboot cannot explain the break. |
| Backup-scheduler iptables change | 2026-11-07 20:42 | `/etc/iptables/rules.v4` mtime. Visible rules touch only inbound ports 9100 and 9095. | PROBABLE (content reviewed) that it does not affect TEJ egress |
| API container and image recreated | 2026-11-11 21:27 UTC | `docker inspect` Created; Compose env has no proxy | CONFIRMED |
| Last app deploy commits | 2026-11-09 to 11-11 | commits `a41c8766`, `4f2f9421`, `c11866de`, `bb896829`; none touch TEJ | CONFIRMED |
| **First observed TEJ failure** | **2026-11-17 13:37:29 UTC** | API log: outgoing POST to the Keycloak token URL, never completed. Nginx logged 499 at 13:37:44, about 15 s later. | CONFIRMED (earliest *observed*) |
| Later failures | 13:38 – 14:12, 12 attempts, all 499 | `woodapp-tenant-access.log` | CONFIRMED |
| Gap with no evidence | 2026-10-02 → 2026-11-17 | No TEJ records exist after Oct 2. Nginx history starts at 2026-11-04 and shows no TEJ `verify-password` between 11-04 and 11-17 other than 11-17. | UNKNOWN. The break could have happened any time in this window. |

**Limitations**
- API container logs cover only the last 5 days, since the container was recreated.
- The Nginx log format has no request-time field.
- There are no Grafana or monitoring exports on this host, and the public IP has no history.
- Because nobody used TEJ between Oct 2 and Nov 17, the true "last working date" cannot be narrowed. **The closest defensible window is 2026-10-02 to 2026-11-17.**

**Evidence levels**
- Successful *TEJ API operation*: Aug 7 – Oct 2, inferred from the saved rows.
- Successful *TCP* or *TLS* to TEJ from this host without a proxy: **no log exists for any date.**
- Successful *authentication* on Nov 17: **none.**

---

## 3. Last Known Working Architecture

**Reconstructed (HIGH CONFIDENCE):**
`Browser → Nginx → wood-app-api (Docker bridge acya-app_wood-app-network) → default route → ens3 → TEJ`, with no proxy.

- The Compose `api` service passes only `Tej__Username` and `Tej__Password`.
- `.env` contains only the keys `TEJ_USERNAME` and `TEJ_PASSWORD`.
- `git log -S` for `HTTPS_PROXY`, `Tej__ProxyUrl` and `10808` returns nothing in any revision.
- `TejConfig` has no proxy field, and no handler configures a proxy (`ApplicationServiceExtentions.cs:104-118`).
- No systemd unit, SSH config, cron job or shell-history entry for any tunnel exists on the host.
  - `~/.ssh` contains only keys and `known_hosts`, with no `config`.
  - Only `ssh.service` and `ssh.socket` exist.
  - `.bash_history` has no `-R`, `-D` or `autossh` entries.

**Not verifiable:** the exact environment of the containers that ran Aug–Oct. They were replaced on 11-11 and earlier. The Compose history shows no proxy lines, so a proxy is unlikely.

---

## 4. Current Architecture

Same as above, with the same code. The only difference is that the TCP connection to `41.225.7.188:443` gets no reply.

- Host: `51.210.10.108/32` (DHCP from OVH). Default route via `51.210.8.1`. `iptables OUTPUT` policy is ACCEPT.
- Container: `172.18.0.3` on the bridge. Gateway `172.18.0.1`. No `extra_hosts`, no custom DNS.

---

## 5. Network Connectivity Evidence

All tests are TCP or TLS only. **No authentication request was sent.** Times are UTC.

| Time | Source | Destination (resolved) | Method | TCP | TLS | Duration | Result |
|---|---|---|---|---|---|---|---|
| 14:10 | host | login-tej (41.225.7.188) | direct (`--noproxy`) | timeout | – | 5.0 s | `curl` rc 28 |
| 14:43 | host | login-tej | direct | timeout | – | 5.0 s | rc 28 |
| 15:33 | host | login-tej / api-tej / tej (all 41.225.7.188) | direct `/dev/tcp` | timeout ×3 | – | 4.0 s each | rc 124 |
| 14:15 | container `wood-app-api` | login-tej | direct `/dev/tcp` | timeout | – | 5.0 s | rc 124 |
| 14:45 | container | login-tej | direct | timeout | – | 5.0 s | rc 124 |
| 14:44 | host | login-tej | via session proxy `127.0.0.1:10808` | OK | OK, certificate verified | about 4.5 s | the server returned an HTTP 500 HTML page for `HEAD /`. This is **not** an authentication result. |
| 14:36 / 14:47 | container | `172.18.0.1:10808` | TCP | **refused** | – | immediate | the listener is bound to loopback only |
| 14:48 | host and container | login-tej | DNS | – | – | – | both resolve 41.225.7.188 |

**Control tests, 15:33 (direct TCP/443 from the host):**

| Target | Result |
|---|---|
| `www.finances.gov.tn` (193.95.2.211) | OPEN in 0.10 s |
| `1.1.1.1` | OPEN in 0.02 s |
| `www.ati.tn` (197.10.242.55) | timeout |
| `www.tunisietelecom.tn` (193.95.51.245) | timeout |

**Path evidence (`tracepath -n 41.225.7.188`, 14:33):**
- Packets leave OVH and reach Tunisian-looking addresses (`193.95.x`, `196.203.189.70`, about 37 ms).
- After that there are no replies. ICMP is often filtered, so this is inconclusive.

**Interpretation**
- DNS: CONFIRMED fine.
- Local firewall and routing: CONFIRMED not blocking. Other internet hosts are reachable.
- The failure is specific to certain Tunisian destinations. It is not specific to the TEJ application. Some Tunisian sites open and some do not.
- **Why direct traffic fails is UNKNOWN.** The candidates are remote-side filtering or geo/IP policy, a transit or peering problem toward Tunisian networks, and IP reputation. None is proven.
- Whether the remote side drops OVH addresses *deliberately* is not shown by any evidence.
- A TCP timeout is not a TEJ decision about credentials.

---

## 6. SSH / SOCKS5 Investigation

| Question | Finding | Level |
|---|---|---|
| Was 10808 used by TEJ before? | No evidence. The port appears in no config, unit, history or code. A `10808` hit in `journalctl` (Jul 23) is a *remote source port* of a scanner. | HIGH |
| Who owns 10808? | `sshd-session` of an interactive `ubuntu@notty` login. The PID changed from 1134453 (login 13:56:23, closed 15:05:39) to 1197478 (login 15:31:55). A new listener appears each time a client logs in with the forward. | CONFIRMED |
| What kind of tunnel? | A session-scoped SSH forward on `127.0.0.1` and `::1`, requested by the client. This is consistent with an SSH `RemoteForward` or a dynamic forward, and the exact option is not visible server-side. | PROBABLE |
| Is it persistent? | No. No unit, no `autossh`, no cron job. It exists only while a client with that forward is logged in. | CONFIRMED |
| Does it survive a reboot or a disconnect? | No. | CONFIRMED |
| Alias or `RemoteForward` removed? | **Cannot be determined.** The configuration lives on the client machine, and the server has no `ssh_config` for it. | UNKNOWN |
| Orphans or port collisions? | None seen. Exactly one listener per login. | HIGH |
| Reachable from the container? | **No.** Loopback-only bind, and `172.18.0.1:10808` refuses connections. | CONFIRMED |
| Source of the logins | `41.230.32.173` (the same address the TEJ dialog users come from) and, at 15:31, `160.158.157.191`. | CONFIRMED |

**Important caveat.** The shell used for this investigation inherits `HTTP(S)_PROXY=socks5://127.0.0.1:10808`. That means the forward appears to be the investigation session's own egress path and is **very probably not a production component.** I used it only for the single `HEAD /` request in §5, and not for anything TEJ-authenticated. Treat the SOCKS5 result as showing "a Tunisia-based egress can reach TEJ", not as proof of any historical setup.

---

## 7. Docker Networking Investigation

- `wood-app-api`: created 2026-11-11 21:27:35, 0 restarts, network `acya-app_wood-app-network` (bridge `172.18.0.0/16`), no `extra_hosts`, no DNS override, no proxy variables. CONFIRMED.
- Compose history: the only networking-related changes since September are `extra_hosts: host.docker.internal` added to **`admin-elance-back`** (the backoffice API, not this one) on 2026-11-07, and the iptables rules for port 9095. Neither affects TEJ egress.
- The container has no route to the host loopback, so no earlier proxy could have worked this way. This agrees with finding 2 in §1.
- The 11-11 recreation changed neither network mode nor egress. Container outbound traffic uses the default route with the Docker NAT like every other outbound call, and e.g. n8n and Firebase calls succeed.
- Host bridges: `docker0` (down), `br-667ea0710721` (`172.18.0.0/16`, in use), and three more. `FORWARD` policy is DROP with Docker's own accept rules.

---

## 8. Application Authentication Flow (no credentials submitted)

`TejRsDialog.handleAuth` (`tej-rs-dialog.tsx:238-251`) → `tejService.verifyPassword` (`tej.service.ts:5`) → Axios (`axios.ts:21`, `timeout: 15000`) → Nginx → `TejController.VerifyPassword` (`TejController.cs:61-76`) → `TejAuthService.GetTokenAsync` / `LoginAsync` (`TejIntegration.cs:543-575`) → `HttpClient.PostAsync` to `https://login-tej.finances.gov.tn/realms/seif/protocol/openid-connect/token`.

Where it fails, with the evidence:

1. TCP connection establishment: **fails.** There is no reply to the SYN.
2. TLS and HTTP: never reached. There is no "response headers" log line for any `TejAuthService` request. API log shows only "Start processing" and "Sending HTTP request", with no completion.
3. TEJ never receives the request. Credentials are **never evaluated.**
4. `HttpClient` has no explicit timeout. The default is 100 s, so the API call is still pending when Axios aborts at about 15 s. Nginx then logs 499. (`13:37:29.94` start → `13:37:44` log = about 15 s.)

**Error classification in the UI**
- `handleAuth` catch: `toast.error(error.response?.data?.message || 'Mot de passe TEJ incorrect')`.
- A timeout, DNS failure, TLS failure or 5xx without a JSON body all produce `error.response === undefined`. All of them therefore show "Mot de passe TEJ incorrect". The UI cannot tell them apart.
- Even when the backend does answer, `TejController.cs:72-75` returns the fixed text "Mot de passe incorrect ou erreur TEJ" for **any** exception, including network errors. So the message is misleading from both sides.
- `TejAuthService.LoginAsync` uses `EnsureSuccessStatusCode()`, which discards the TEJ body, so a real 401 from Keycloak cannot be told apart from a 500.

---

## 9. Root Cause Analysis

### 9.1 Cause
**Immediate cause (CONFIRMED):** the API container cannot open a TCP connection to `41.225.7.188:443`, so the token request hangs until the browser gives up.

**Underlying cause (PROBABLE, not proven):** an external change affecting this VPS's route or address to those Tunisian destinations, after 2026-10-02. This is supported by:
- (a) no relevant local change: no firewall, routing, DNS, code or proxy difference;
- (b) other internet hosts reachable;
- (c) several Tunisian destinations also unreachable;
- (d) the same endpoint worked from the same environment, without a proxy, until Oct 2.

**Alternatives not excluded**
- the VPS public IP changed. The address is DHCP-leased and there is no history, but `acya.site` DNS points to the current address, so a change is less likely;
- an OVH-side routing or peering issue toward Tunisia;
- a TEJ-side IP or reputation block, possibly triggered by repeated automated requests.

### 9.2 Contributing but non-causal
The frontend and backend error handling turns a network failure into an apparent password error (see §8).

### 9.3 Corrections to the first report
- It said the Tunisian firewall **blocks** foreign IPs. The evidence only shows that a TCP handshake gets no reply. The reason is UNKNOWN.
- It described the SOCKS tunnel as a host feature that the container merely lacked. It is a per-login SSH forward, probably the investigation session itself.
- It treated "no proxy support in code" as the regression. That is not a regression, because the code never had one and worked until Oct 2.
- The 15-second figure is derived from log timestamps (API log start vs Nginx log time), since Nginx does not log request time.
- A Nov 15/16 set of `/tej/*` requests with 404 come from the unrelated address `195.178.110.18` without the `/api` prefix. They are scanner probes, not users.

---

## 10. Historical vs Current Comparison

| Component | Previously working | Current | Evidence | Possible impact |
|---|---|---|---|---|
| SSH tunnel | None found; none needed if direct egress worked | None persistent; a per-login forward exists only for the current session | §6 | None for the app |
| SOCKS5 endpoint | None | Loopback `127.0.0.1:10808`, tied to a login | §6 | Not usable by containers |
| Port 10808 | Not used (no trace) | Session-owned listener | `ss`, PID change | Not a production dependency |
| Docker networking | Bridge with NAT | Same bridge, container recreated 11-11 | `docker inspect`, `ip route`, Compose history | None found |
| API proxy configuration | None (every revision) | None | `git log -S`, `.env` key names, container env names | None |
| VPS public IP | Unknown (no history) | `51.210.10.108` (DHCP, matches `acya.site`) | `ip addr`, `getent` | Cannot rule out a change |
| DNS | Resolves | Resolves, same IP from host and container | §5 | None |
| Outbound routing | Unknown | Default route normal; `OUTPUT ACCEPT`; tracepath leaves OVH and reaches Tunisia | `ip route`, `iptables -S`, `tracepath` | Local routing is not the problem |
| TEJ application code | Same | Same (last change 2026-06-18) | `git log` | No regression |
| Deployment configuration | Same TEJ settings | Same TEJ settings; unrelated Compose changes since September | Compose history | None found |

---

## 11. Secondary Security and Architecture Findings

These do **not** explain the connectivity failure.

| ID | Finding | Evidence | Risk | Cause of current failure? | Future correction |
|---|---|---|---|---|---|
| F1 Tenant isolation | `TejConfig` is a singleton `IOptions` and the controller overwrites `Username` and `Password` on it. | `TejController.cs:66-67, 101-102`; `ApplicationServiceExtentions.cs:103` | One tenant's TEJ credentials can be used by another tenant's request, and concurrent requests can overwrite each other. | No | Pass credentials per request and never mutate options. |
| F2 Cookie isolation | One `CookieContainer` on the pooled handler of `TejApiClient`. | `ApplicationServiceExtentions.cs:114-118` | TEJ and F5 cookies are shared across tenants. This also contaminates the upload sequence in `TejIntegration.cs:660-666`. | No. The failing request goes through `TejAuthService`, not this handler. | A per-request or per-tenant cookie container. |
| F3 Token lifecycle | `TejAuthService` is a transient typed client, so its token fields reset on every request. | `TejIntegration.cs:529-600`; DI at lines 104-108 | The cache never works across requests. `verify-beneficiary` and `submit-certificate` log in again with whatever credentials are in the singleton. The code comment at `TejController.cs:85` is wrong. | No | A tenant- and account-keyed cache with expiry. |
| F4 Authorization | `TejController` has no `[Authorize]`. | `TejController.cs:11-13` | Unauthenticated callers can reach TEJ endpoints for any tenant slug. | No | Add authorization and tenant-claim checks. |

---

## 12. Remediation Options

### Option A — Restore the previous working configuration
**Not available.** There is nothing to restore: no proxy, tunnel, unit or config ever existed here. The previous "configuration" was plain direct egress, and the current problem is in the path, not on our host.

### Option B — Permanent controlled proxy route
**Only if direct reachability cannot be restored.**

| Aspect | Assessment |
|---|---|
| What | A persistent egress via a Tunisian host: a systemd-managed SSH tunnel with `autossh`, or a small proxy service on a Tunisian VPS or router. |
| .NET compatibility | **UNVERIFIED.** I did not test this. My understanding is that .NET 6 and later accept `socks5://` proxy URLs in `WebProxy` for `SocketsHttpHandler` and `HttpClientHandler`, but I have not confirmed it against this container (`DOTNET_VERSION=7.0.20`) or this code. The June note's `new WebProxy("socks5://…")` snippet was never run. Prove it on staging first. Fallbacks are an HTTP CONNECT proxy in front of the tunnel, or a custom `ConnectCallback` with a tested SOCKS client. |
| Container access | The listener must bind to the Docker bridge gateway address (for example `172.18.0.1`), not `0.0.0.0`, with an iptables rule restricting it to the `172.18.0.0/16` subnet. This follows the existing pattern for port 9095. Never publish it publicly. |
| Persistence and monitoring | Systemd restart policy, a health probe that checks TCP to TEJ through the proxy (no authentication), and an alert. |
| Risks | The Tunisian endpoint becomes a single point of failure and a trust point for all tenants' TEJ traffic. Credentials transit it, although TLS is end-to-end. |
| Rollback | Remove `Tej__ProxyUrl`. The application returns to direct egress. |
| Scope | Medium: code, Compose, a host service and monitoring. |

### Option C — Restore direct connectivity
- **First step (no change to our system):** ask OVH support to run a route test toward `41.225.7.188` and to confirm whether the VPS address `51.210.10.108` has been filtered or changed. Ask TEJ (`contact.tej@finances.gov.tn`, as already noted in `SOL-TEJ-SSH.md`) whether the address is blocked or can be whitelisted.
- **Advantages:** no new infrastructure; matches how it worked before.
- **Disadvantages:** depends on third parties and may be slow.
- **Alternative:** a new public IP from OVH, if the address is the problem.
- **Scope:** low on our side. **Rollback:** none needed.

### Ranking
1. **C** — the evidence points to the path, not to our configuration. It also costs nothing to try.
2. **B** — if C fails or takes too long. Build it as in the table, and test SOCKS5 support first.
3. **A** — not applicable.

---

## 13. Recommended Solution

Choose **Option C first, and decide on B afterwards.** The evidence does not yet prove an external block, so do not select B yet. Independently of the connectivity outcome, make the UI and the controller report network failures honestly. That is a small, safe change that stops users from believing their password is wrong. It is a separate decision from connectivity.

---

## 14. Implementation Plan (proposal only; nothing has been changed)

1. **No-risk evidence gathering (no deployment):**
   - Run the same TCP test (no authentication) to `login-tej.finances.gov.tn:443` from a second non-OVH host, and from the user's own network. If the second host also fails, the problem is on the TEJ or Tunisian side. If it succeeds, the problem is specific to OVH or this address.
   - Open an OVH ticket and, in parallel, a TEJ inquiry.
   - Check whether OVH recorded a change of the VPS IP.
2. **If the address is filtered:** request whitelisting, or a new IP from OVH.
3. **If direct access cannot be restored:** staging proof of concept for Option B, including the SOCKS5 compatibility test.
4. **Error handling** (frontend and `TejController`): distinguish timeout, DNS, TLS, remote HTTP error and invalid credentials. Also set an explicit `HttpClient` timeout shorter than the Axios one.
5. **Later:** fix F1–F4 in §11.

## 15. Rollback Plan

- Step 1 changes nothing.
- Whitelisting or an IP change: revert the address at OVH. Existing configuration is not touched.
- Option B: remove the proxy variable and stop the tunnel service. The container returns to direct egress.
- Code changes are reverted through Git, with the TEJ credentials in `.env` untouched throughout.

---

## 16. Remaining Unknowns

1. The exact date of the first failure. The window is Oct 2 – Nov 17.
2. Whether `51.210.10.108` changed. No history is available.
3. Why the TCP handshake gets no reply, and at which hop. Tracepath is inconclusive.
4. Whether the batch upload, which the June note says was blocked from outside, worked directly between Aug 7 and Oct 2, or was routed some other way. The saved rows suggest it succeeded, but the transport is not logged.
5. The client-side SSH configuration that creates the 10808 forward.
6. Whether TEJ locks accounts after failed attempts. Not relevant now, because requests never reach TEJ.

---

## 17. Evidence Appendix

| Item | Source / command | Observation | Time |
|---|---|---|---|
| TEJ rows | `psql … SELECT … FROM tenant_socofeb.tbl_holding_tax` (read-only) | 17 rows with "Retenue à la source TEJ", Aug 7 – Oct 2 | 14:28 |
| Row creation logic | `tej-rs-dialog.tsx:327-388, 398-412` | `saveToLocalDatabase` runs only after `submitCertificate` returns | 14:41 |
| No proxy ever | `git log --all -S"HTTPS_PROXY" -S"Tej__ProxyUrl" -S"10808"`; `git grep` | no matches outside the planning note | 15:33 |
| Compose env | `docker-compose.yml:60-61` | only `Tej__Username` and `Tej__Password` | 14:00 |
| Container created | `docker inspect wood-app-api` | 2026-11-11 21:27:35Z, restarts 0 | 15:32 |
| Failures | `/var/log/nginx/woodapp-tenant-access.log` | 12 × `POST /api/tej/verify-password` → 499, 13:37–14:12 | 14:16 |
| API log | `docker logs -t wood-app-api` | "Sending HTTP request POST …openid-connect/token" with no completion line | 14:07 |
| Direct TCP | `curl --noproxy '*'`; `bash /dev/tcp` | timeouts | 14:10, 14:15, 14:43, 14:45, 15:33 |
| Control | same | `1.1.1.1` and `www.finances.gov.tn` open; `ati.tn` and `tunisietelecom.tn` time out | 15:33 |
| Firewall | `sudo iptables -S` | `OUTPUT ACCEPT`; rules for 9100 and 9095 only | 15:32 |
| Routing | `ip route`, `tracepath -n 41.225.7.188` | default via `51.210.8.1`; reaches `196.203.189.70`, then silence | 14:33, 15:32 |
| 10808 owner | `sudo ss -ltnp`; `ps` | PID 1134453 (login 13:56) then 1197478 (login 15:31) | 14:12, 15:33 |
| SSH sessions | `journalctl -t sshd-session` | logins from `41.230.32.173` and `160.158.157.191` | 15:33 |
| Container → 10808 | `docker exec … /dev/tcp/172.18.0.1/10808` | connection refused | 14:36, 14:47 |
| Reboot history | `who -b`, `journalctl --list-boots` | last boot 2026-07-08 20:20 | 14:29, 14:42 |
| Last TEJ code change | `git log -- …/Controllers/tej …/Services/tej` | `515e4232`, 2026-06-18 | 14:01 |

---

## Final Questions

**Q1. Did TEJ connectivity previously work from this production environment?**
Yes. HIGH CONFIDENCE, based on 17 saved TEJ-origin records from Aug 7 to Oct 2.

**Q2. What was the exact historical connectivity mechanism?**
Direct egress with no proxy. HIGH CONFIDENCE, because no proxy configuration or code exists in any revision. The exact transport used at the time is not logged.

**Q3. What changed between the last successful operation and the first failure?**
UNKNOWN. Nothing in our code, Compose, proxy or firewall that affects TEJ changed. The only local events were the 11-07 inbound iptables edit and the 11-11 container recreation, and neither touches TEJ egress. An external change is PROBABLE.

**Q4. Why does the host currently reach TEJ through SOCKS5 but not directly?**
The session's SOCKS5 route exits from a different network (probably Tunisian), and the direct route from OVH gets no TCP reply. Why direct fails is UNKNOWN.

**Q5. Why can the Docker API container not use the currently available route?**
The listener is bound to loopback only and belongs to an interactive SSH session. The container's `172.18.0.1:10808` refuses connections. The application also has no proxy code.

**Q6. Does the current evidence prove that TEJ rejected the credentials?**
No. The request never reaches TEJ, so no credential check takes place. CONFIRMED.

**Q7. Is the frontend displaying an incorrect error message for a network failure?**
Yes. CONFIRMED (`tej-rs-dialog.tsx:249` plus `TejController.cs:72-75`).

**Q8. Can we restore the previous working architecture without changing TEJ credentials?**
There is no previous proxy architecture to restore. The previous state was direct egress, and restoring it requires the path to TEJ to work again (§12, Option C). No credential change is involved in any option.

**Q9. What is the smallest safe correction?**
Nothing in the code is needed for connectivity. The smallest safe actions are the external checks in §14 step 1, and, separately, honest error reporting.

**Q10. What additional evidence is still needed before implementation?**
(a) A TCP test to TEJ from a non-OVH host. (b) OVH confirmation of the VPS address history and route status. (c) A TEJ answer on any address filtering. (d) A staging test of SOCKS5 support on .NET 7, if Option B is ever needed.

---

## Compliance and disclosure

- **No changes made:** no source, configuration, credential, database or container change; no restarts; no SSH tunnels created or changed; no Nginx, firewall or DNS change; no commit or push.
- **No TEJ authentication or business operation was triggered.** All network tests were TCP connects or one `HEAD /` request on the TEJ root, with no credentials.
- **Database access was read-only `SELECT` queries** on `tbl_holding_tax` (reference numbers, dates, percentages). No credentials or personal data are reproduced here.
- **Secret exposure to flag:** during the earlier phase, a `docker inspect` of the API container printed its environment into this conversation's tool output. That output included the JWT signing key, service tokens and a GitHub token. None of these values are in any report file. **Treat those secrets as exposed and rotate them under your own change process.** I did not rotate anything. The TEJ credentials were not in that output; `Tej__Username` and `Tej__Password` were empty in the container environment, so they must be loaded some other way. That detail is worth checking, as it may also matter for how credentials reach the service.
- **New file only:** `ACYA_TEJ_CONNECTIVITY_REGRESSION_REPORT.md`. The earlier report file is unchanged, and §9.3 lists the points where this report corrects it.
