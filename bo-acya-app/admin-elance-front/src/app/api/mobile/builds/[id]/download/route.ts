import { NextResponse } from "next/server";
import { getAdminAuthToken, getCoreApiToken, fetchMobileBuildById, requestMobileDownloadToken } from "@/lib/mobileBackend";

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
    const build = await fetchMobileBuildById(coreToken, buildId);

    if (!build) {
      return NextResponse.json({ error: `Build #${buildId} not found.` }, { status: 404 });
    }

    if (build.status !== "Succeeded" || !build.artifactPath) {
      return NextResponse.json(
        { error: "Artifact is not available for incomplete or failed builds." },
        { status: 400 }
      );
    }

    // Request short-lived signed download token from core API
    const downloadInfo = await requestMobileDownloadToken(coreToken, buildId, build.tenantId);

    // Extract the HMAC token from the generated downloadUrl
    const rawUrl = downloadInfo.downloadUrl;
    let signedToken = "";
    try {
      const parsed = new URL(rawUrl, "http://localhost");
      signedToken = parsed.searchParams.get("token") || "";
    } catch {
      const match = rawUrl.match(/[?&]token=([^&]+)/);
      if (match) signedToken = decodeURIComponent(match[1]);
    }

    if (!signedToken) {
      return NextResponse.json({ error: "Failed to generate signed download token." }, { status: 500 });
    }

    // Determine the real artifact filename
    const realFileName = build.artifactPath.split("/").pop() || `${build.tenantId.toUpperCase()}-${build.version}-${build.buildNumber}.apk`;

    // Return the safe Next.js route download URL
    const safeDownloadUrl = `/api/mobile/builds/download?token=${encodeURIComponent(signedToken)}&tenant=${encodeURIComponent(build.tenantId)}&filename=${encodeURIComponent(realFileName)}`;

    return NextResponse.json({
      success: true,
      releaseId: build.id,
      tenantId: build.tenantId,
      version: build.version,
      fileName: realFileName,
      downloadUrl: safeDownloadUrl,
      expiresAt: downloadInfo.expiresAt,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/mobile/builds/[id]/download:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to authorize artifact download." },
      { status: 500 }
    );
  }
}
