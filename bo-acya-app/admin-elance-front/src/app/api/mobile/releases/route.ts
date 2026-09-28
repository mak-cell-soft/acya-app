import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, fetchMobileReleases } from "@/lib/mobileBackend";

export async function GET(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || undefined;

    const coreToken = await getCoreApiToken(adminToken);
    const releases = await fetchMobileReleases(coreToken, tenantId);

    return NextResponse.json(releases);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/releases:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load mobile releases." },
      { status: 500 }
    );
  }
}
