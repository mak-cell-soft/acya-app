import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, fetchFirebaseApps } from "@/lib/mobileBackend";

export async function GET(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json(
        { error: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }

    const coreToken = await getCoreApiToken(adminToken);
    const apps = await fetchFirebaseApps(coreToken);

    return NextResponse.json(apps);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/firebase:", error);
    const message = error instanceof Error ? error.message : "Failed to load Firebase applications.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
