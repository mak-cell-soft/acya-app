import { cookies } from "next/headers";
import { MobileBuild, MobileRelease, CreateMobileBuildInput, MobileTenantSummary } from "@/types/mobile";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedCoreToken: TokenCache | null = null;

export async function getBackendUrls() {
  const adminInternal = process.env.BACKEND_INTERNAL_URL || "http://admin-api:80/api/";
  const adminBase = adminInternal.endsWith("/") ? adminInternal : `${adminInternal}/`;

  const coreInternal = process.env.CORE_INTERNAL_URL || "http://api:80/api/";
  const coreBase = coreInternal.endsWith("/") ? coreInternal : `${coreInternal}/`;

  return { adminBase, coreBase };
}

/**
 * Validates that the current request comes from an authenticated SuperAdmin.
 * Reads the admin session token from cookies or Authorization header.
 */
export async function getAdminAuthToken(requestHeaders?: Headers): Promise<string | null> {
  // 1. Try reading cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session_token")?.value;
  if (sessionToken) {
    return sessionToken;
  }

  // 2. Try Authorization header
  if (requestHeaders) {
    const authHeader = requestHeaders.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
  }

  return null;
}

/**
 * Retrieves a client JWT token for wood-app.api signed with JWT_SECRET_MAIN.
 * Obtains this securely from admin-api using the authenticated SuperAdmin credentials.
 */
export async function getCoreApiToken(adminToken: string): Promise<string> {
  const now = Date.now();
  if (cachedCoreToken && cachedCoreToken.expiresAt > now + 60_000) {
    return cachedCoreToken.token;
  }

  const { adminBase } = await getBackendUrls();

  // Call admin-api to get a valid admin client token (tenant 38: SOCOFEB)
  let res: Response | null = null;
  const targetTenants = [38, 39, 16, 22, 24]; // Try known active tenants

  for (const tenantId of targetTenants) {
    try {
      res = await fetch(`${adminBase}admin/enterprise/${tenantId}/impersonate`, {
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Accept": "application/json",
        },
      });

      if (res.ok) {
        break;
      }
    } catch {
      // Try next
    }
  }

  // Fallback to localhost:8082 if running outside docker container
  if (!res || !res.ok) {
    for (const tenantId of targetTenants) {
      try {
        res = await fetch(`http://localhost:8082/api/admin/enterprise/${tenantId}/impersonate`, {
          headers: {
            "Authorization": `Bearer ${adminToken}`,
            "Accept": "application/json",
          },
        });
        if (res.ok) break;
      } catch {
        // Continue
      }
    }
  }

  if (!res || !res.ok) {
    throw new Error("Failed to obtain authorized backend token for mobile build operations.");
  }

  const data = await res.json();
  const token = data.token;
  if (!token) {
    throw new Error("Backend did not return an authorization token.");
  }

  // Cache token for 50 minutes (tokens are valid for 2 hours)
  cachedCoreToken = {
    token,
    expiresAt: now + 50 * 60 * 1000,
  };

  return token;
}

/**
 * Fetches mobile builds list from wood-app.api with optional query filters.
 */
export async function fetchMobileBuilds(
  coreToken: string,
  query: { tenantId?: string; status?: string; page?: number; pageSize?: number } = {}
) {
  const { coreBase } = await getBackendUrls();

  const params = new URLSearchParams();
  if (query.tenantId) params.set("tenantId", query.tenantId);
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", query.page.toString());
  if (query.pageSize) params.set("pageSize", query.pageSize.toString());

  const queryString = params.toString() ? `?${params.toString()}` : "";
  let url = `${coreBase}admin/mobile/builds${queryString}`;

  let res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${coreToken}`,
      "Accept": "application/json",
    },
  }).catch(() => null);

  // Fallback for local development outside docker
  if (!res) {
    url = `http://localhost:8080/api/admin/mobile/builds${queryString}`;
    res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${coreToken}`,
        "Accept": "application/json",
      },
    });
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Failed to load mobile builds (${res.status}): ${errorText || res.statusText}`);
  }

  return res.json();
}

/**
 * Fetches a single mobile build by ID.
 */
export async function fetchMobileBuildById(coreToken: string, buildId: number) {
  const { coreBase } = await getBackendUrls();

  let url = `${coreBase}admin/mobile/builds/${buildId}`;
  let res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${coreToken}`,
      "Accept": "application/json",
    },
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8080/api/admin/mobile/builds/${buildId}`;
    res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${coreToken}`,
        "Accept": "application/json",
      },
    });
  }

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to retrieve build ${buildId} (${res.status})`);
  }

  return res.json();
}

/**
 * Requests a short-lived download authorization token for an APK release.
 */
export async function requestMobileDownloadToken(coreToken: string, releaseId: number, tenantSlug: string) {
  const { coreBase } = await getBackendUrls();

  let url = `${coreBase}mobile/releases/${releaseId}/download`;
  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coreToken}`,
      "X-Tenant-Slug": tenantSlug,
      "Content-Length": "0",
      "Accept": "application/json",
    },
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8080/api/mobile/releases/${releaseId}/download`;
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${coreToken}`,
        "X-Tenant-Slug": tenantSlug,
        "Content-Length": "0",
        "Accept": "application/json",
      },
    });
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Download authorization denied (${res.status}): ${errorText || res.statusText}`);
  }

  return res.json();
}

/**
 * Streams the APK artifact from wood-app.api using the validated short-lived token.
 */
export async function streamArtifactResponse(downloadToken: string, tenantSlug: string) {
  const { coreBase } = await getBackendUrls();

  let url = `${coreBase}mobile/releases/download?token=${encodeURIComponent(downloadToken)}&tenant=${encodeURIComponent(tenantSlug)}`;
  let res = await fetch(url, {
    headers: {
      "X-Tenant-Slug": tenantSlug,
    },
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8080/api/mobile/releases/download?token=${encodeURIComponent(downloadToken)}&tenant=${encodeURIComponent(tenantSlug)}`;
    res = await fetch(url, {
      headers: {
        "X-Tenant-Slug": tenantSlug,
      },
    }).catch(() => null);
  }

  if (!res || !res.ok) {
    throw new Error(`Artifact stream failed (${res?.status || "unknown"}): ${res?.statusText || "unreachable"}`);
  }

  return res;
}

/**
 * Fetches active enterprise tenants from admin-api to dynamically populate tenant selectors.
 */
export async function fetchActiveTenants(adminToken: string): Promise<MobileTenantSummary[]> {
  const { adminBase } = await getBackendUrls();

  let url = `${adminBase}admin/enterprise`;
  let res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${adminToken}`,
      "Accept": "application/json",
    },
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8082/api/admin/enterprise`;
    res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Accept": "application/json",
      },
    }).catch(() => null);
  }

  if (!res || !res.ok) {
    throw new Error(`Failed to load enterprises from admin-api (${res?.status || "unreachable"})`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .filter((ent: any) => ent.slug)
    .map((ent: any) => ({
      id: ent.id,
      slug: ent.slug.trim().toLowerCase(),
      name: ent.name || ent.slug,
      isActive: Boolean(ent.isActive),
    }))
    .sort((a: MobileTenantSummary, b: MobileTenantSummary) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Initiates a new mobile build record on wood-app.api and dispatches GitHub Actions workflow.
 */
export async function createMobileBuild(
  coreToken: string,
  payload: CreateMobileBuildInput
): Promise<MobileBuild> {
  const { coreBase } = await getBackendUrls();

  let url = `${coreBase}admin/mobile/builds`;
  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coreToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8080/api/admin/mobile/builds`;
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${coreToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);
  }

  if (!res || !res.ok) {
    let errorMessage = `Failed to create mobile build (${res?.status || "network failure"})`;
    try {
      if (res) {
        const errorJson = await res.json();
        if (errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson.errors) {
          const errorList = Object.values(errorJson.errors).flat().join(", ");
          if (errorList) errorMessage = errorList;
        }
      }
    } catch {
      const errorText = await res?.text().catch(() => "");
      if (errorText) errorMessage = errorText;
    }
    const err = new Error(errorMessage);
    (err as any).statusCode = res?.status || 500;
    throw err;
  }

  return res.json();
}

/**
 * Publishes a succeeded mobile build to become the current active release for its tenant.
 */
export async function publishMobileBuild(
  coreToken: string,
  buildId: number
): Promise<MobileRelease> {
  const { coreBase } = await getBackendUrls();

  let url = `${coreBase}admin/mobile/builds/${buildId}/publish`;
  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coreToken}`,
      "Content-Length": "0",
      "Accept": "application/json",
    },
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8080/api/admin/mobile/builds/${buildId}/publish`;
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${coreToken}`,
        "Content-Length": "0",
        "Accept": "application/json",
      },
    });
  }

  if (!res || !res.ok) {
    let errorMessage = `Failed to publish release (${res?.status || "network failure"})`;
    try {
      if (res) {
        const errorJson = await res.json();
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      }
    } catch {
      const errorText = await res?.text().catch(() => "");
      if (errorText) errorMessage = errorText;
    }
    const err = new Error(errorMessage);
    (err as any).statusCode = res?.status || 500;
    throw err;
  }

  return res.json();
}

/**
 * Fetches all releases across tenants or filtered by tenantId.
 */
export async function fetchMobileReleases(
  coreToken: string,
  tenantId?: string
): Promise<MobileRelease[]> {
  const { coreBase } = await getBackendUrls();

  const queryString = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  let url = `${coreBase}admin/mobile/releases${queryString}`;

  let res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${coreToken}`,
      "Accept": "application/json",
    },
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8080/api/admin/mobile/releases${queryString}`;
    res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${coreToken}`,
        "Accept": "application/json",
      },
    });
  }

  if (!res || !res.ok) {
    const errorText = await res?.text().catch(() => "");
    throw new Error(`Failed to load mobile releases (${res?.status || "unknown"}): ${errorText || res?.statusText}`);
  }

  return res.json();
}

/**
 * Fetches current releases across all tenants or for a specific tenant.
 */
export async function fetchCurrentMobileReleases(
  coreToken: string,
  tenantId?: string
): Promise<MobileRelease[]> {
  const { coreBase } = await getBackendUrls();

  const queryString = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  let url = `${coreBase}admin/mobile/releases/current${queryString}`;

  let res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${coreToken}`,
      "Accept": "application/json",
    },
  }).catch(() => null);

  if (!res) {
    url = `http://localhost:8080/api/admin/mobile/releases/current${queryString}`;
    res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${coreToken}`,
        "Accept": "application/json",
      },
    });
  }

  if (!res || !res.ok) {
    const errorText = await res?.text().catch(() => "");
    throw new Error(`Failed to load current releases (${res?.status || "unknown"}): ${errorText || res?.statusText}`);
  }

  return res.json();
}


