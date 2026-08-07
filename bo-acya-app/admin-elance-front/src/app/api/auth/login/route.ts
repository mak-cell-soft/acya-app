import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://admin-api:80/api/";
    const normalizedUrl = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;

    let res = await fetch(`${normalizedUrl}admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);

    if (!res || !res.ok) {
      // Fallback to NEXT_PUBLIC_API_URL if internal request failed
      const publicBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const normPublic = publicBase.endsWith("/") ? publicBase : `${publicBase}/`;
      res = await fetch(`${normPublic}admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText || "Invalid credentials" }, { status: res.status });
    }

    const data = await res.json();

    const response = NextResponse.json({
      success: true,
      username: data.username,
      role: data.role,
    });

    // Set httpOnly cookie for maximum security against XSS
    response.cookies.set("admin_session_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    response.cookies.set("admin_username", data.username, {
      httpOnly: false, // UI display only
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
