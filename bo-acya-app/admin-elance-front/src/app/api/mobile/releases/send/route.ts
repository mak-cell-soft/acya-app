import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, sendMobileAppInvitation } from "@/lib/mobileBackend";

export async function POST(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await request.json();
    if (!body || !body.tenantId || !body.userId) {
      return NextResponse.json({ error: "tenantId and userId are required." }, { status: 400 });
    }

    const coreToken = await getCoreApiToken(adminToken);
    const result = await sendMobileAppInvitation(coreToken, {
      tenantId: String(body.tenantId),
      userId: Number(body.userId),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error in POST /api/mobile/releases/send:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send mobile app invitation." },
      { status: 500 }
    );
  }
}
