import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, fetchTenantUsersForMobile } from "@/lib/mobileBackend";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { tenantId } = await params;
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId parameter is required." }, { status: 400 });
    }

    const coreToken = await getCoreApiToken(adminToken);
    const users = await fetchTenantUsersForMobile(coreToken, tenantId);

    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/tenants/[tenantId]/users:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load tenant users." },
      { status: 500 }
    );
  }
}
