import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, publishMobileBuild } from "@/lib/mobileBackend";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { id } = await params;
    const buildId = parseInt(id, 10);
    if (isNaN(buildId)) {
      return NextResponse.json({ error: "Invalid build ID." }, { status: 400 });
    }

    const coreToken = await getCoreApiToken(adminToken);
    const release = await publishMobileBuild(coreToken, buildId);

    return NextResponse.json(release);
  } catch (error: unknown) {
    console.error("Error in POST /api/mobile/builds/[id]/publish:", error);
    const statusCode = (error as any)?.statusCode || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish release." },
      { status: statusCode }
    );
  }
}
