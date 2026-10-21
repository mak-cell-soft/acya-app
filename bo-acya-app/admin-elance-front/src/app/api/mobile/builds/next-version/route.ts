import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, fetchNextMobileVersion } from "@/lib/mobileBackend";

export async function GET(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId || !tenantId.trim()) {
      return NextResponse.json({ error: "tenantId query parameter is required." }, { status: 400 });
    }

    const coreToken = await getCoreApiToken(adminToken);
    const data = await fetchNextMobileVersion(coreToken, tenantId.trim().toLowerCase());
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/builds/next-version:", error);
    const statusCode = (error as any)?.statusCode || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve next version suggestion." },
      { status: statusCode }
    );
  }
}
