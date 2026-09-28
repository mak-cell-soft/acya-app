import { NextResponse } from "next/server";
import { getAdminAuthToken, fetchActiveTenants } from "@/lib/mobileBackend";

export async function GET(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const tenants = await fetchActiveTenants(adminToken);
    return NextResponse.json(tenants);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/tenants:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load tenants" },
      { status: 500 }
    );
  }
}
