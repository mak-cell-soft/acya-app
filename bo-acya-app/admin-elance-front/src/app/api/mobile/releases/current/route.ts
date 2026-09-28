import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, fetchCurrentMobileReleases } from "@/lib/mobileBackend";

export async function GET(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || undefined;

    const coreToken = await getCoreApiToken(adminToken);
    const currentReleases = await fetchCurrentMobileReleases(coreToken, tenantId);

    return NextResponse.json(currentReleases);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/releases/current:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load current releases." },
      { status: 500 }
    );
  }
}
