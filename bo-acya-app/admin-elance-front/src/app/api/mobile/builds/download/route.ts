import { NextResponse } from "next/server";
import { streamArtifactResponse } from "@/lib/mobileBackend";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const tenant = searchParams.get("tenant") || "socofeb";
    const filename = searchParams.get("filename") || `acya-${tenant}.apk`;

    if (!token) {
      return NextResponse.json({ error: "Download token is required." }, { status: 400 });
    }

    const upstreamResponse = await streamArtifactResponse(token, tenant);

    const headers = new Headers();
    headers.set("Content-Type", upstreamResponse.headers.get("content-type") || "application/vnd.android.package-archive");
    
    // Ensure clean filename in Content-Disposition
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    headers.set("Content-Disposition", `attachment; filename="${safeFilename}"`);

    const contentLength = upstreamResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    const acceptRanges = upstreamResponse.headers.get("accept-ranges");
    if (acceptRanges) {
      headers.set("Accept-Ranges", acceptRanges);
    }

    // Stream response body to client
    return new NextResponse(upstreamResponse.body, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    console.error("Error streaming mobile build artifact:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download artifact." },
      { status: 500 }
    );
  }
}
