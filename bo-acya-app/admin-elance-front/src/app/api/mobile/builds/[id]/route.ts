import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, fetchMobileBuildById } from "@/lib/mobileBackend";

export async function GET(
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
    const build = await fetchMobileBuildById(coreToken, buildId);

    if (!build) {
      return NextResponse.json({ error: `Build #${buildId} not found.` }, { status: 404 });
    }

    // Sanitize any internal filesystem paths
    const sanitizedBuild = {
      ...build,
      artifactFileName: build.artifactPath ? build.artifactPath.split("/").pop() : null,
      artifactPath: undefined,
      isArtifactAvailable: build.status === "Succeeded" && !!build.artifactSize,
    };

    return NextResponse.json(sanitizedBuild);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/builds/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve build details" },
      { status: 500 }
    );
  }
}
