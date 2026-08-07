export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const isServer = typeof window === "undefined";
  const defaultApiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";

  let url = endpoint;
  if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    const base = defaultApiBase.endsWith("/") ? defaultApiBase : `${defaultApiBase}/`;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    url = `${base}${cleanEndpoint}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach token if present in localStorage or cookie
  if (!isServer) {
    const token = localStorage.getItem("token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 401 && !isServer && !window.location.pathname.startsWith("/login")) {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return response;
}
