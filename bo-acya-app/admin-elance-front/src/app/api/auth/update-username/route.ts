import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session_token")?.value;

    const body = await request.json();
    const { newUsername } = body;

    if (!newUsername || newUsername.trim().length < 3) {
      return NextResponse.json({ error: "Le nom d'utilisateur doit contenir au moins 3 caractères." }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization") || (token ? `Bearer ${token}` : "");

    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://admin-api:80/api/";
    const normalizedUrl = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;

    let res = await fetch(`${normalizedUrl}admin/auth/update-username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ newUsername }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const publicBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const normPublic = publicBase.endsWith("/") ? publicBase : `${publicBase}/`;
      res = await fetch(`${normPublic}admin/auth/update-username`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({ newUsername }),
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText || "Failed to update username" }, { status: res.status });
    }

    const data = await res.json();

    const response = NextResponse.json({
      success: true,
      token: data.token,
      username: data.username,
      role: data.role,
    });

    if (data.token) {
      response.cookies.set("admin_session_token", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }

    if (data.username) {
      response.cookies.set("admin_username", data.username, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
