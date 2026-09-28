import { NextResponse } from "next/server";
import { 
  getAdminAuthToken, 
  getCoreApiToken, 
  fetchMobileBuilds, 
  createMobileBuild 
} from "@/lib/mobileBackend";
import { MobileBuild } from "@/types/mobile";

export async function GET(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : undefined;

    const coreToken = await getCoreApiToken(adminToken);
    const builds: MobileBuild[] = await fetchMobileBuilds(coreToken, { tenantId, status, page, pageSize });

    // Sanitize any internal filesystem paths before returning to browser
    const sanitizedBuilds = builds.map((build: MobileBuild) => ({
      ...build,
      // Only keep filename in artifactPath or relative path, never internal server paths
      artifactFileName: build.artifactPath ? build.artifactPath.split("/").pop() : null,
      artifactPath: undefined, // Strip internal path
      isArtifactAvailable: build.status === "Succeeded" && !!build.artifactSize,
    }));

    return NextResponse.json(sanitizedBuilds);
  } catch (error: unknown) {
    console.error("Error in GET /api/mobile/builds:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve mobile builds" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const { tenantId, version, releaseNotes, gitBranch, environment } = body;

    // 1. Tenant validation
    if (!tenantId || typeof tenantId !== "string" || !tenantId.trim()) {
      return NextResponse.json({ error: "Tenant is required." }, { status: 400 });
    }

    // 2. Version validation
    if (!version || typeof version !== "string" || !version.trim()) {
      return NextResponse.json({ error: "Version is required." }, { status: 400 });
    }

    // Semantic version validation (e.g. 1.0.0, 1.0.1, 2.0.0)
    const semVerRegex = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
    if (!semVerRegex.test(version.trim())) {
      return NextResponse.json(
        { error: "Invalid semantic version format. Examples: 1.0.0, 1.0.1, 2.0.0" },
        { status: 400 }
      );
    }

    // 3. Environment validation
    const allowedEnvironments = ["production", "staging", "development"];
    const targetEnv = (typeof environment === "string" && environment.trim()) 
      ? environment.trim().toLowerCase() 
      : "production";

    if (!allowedEnvironments.includes(targetEnv)) {
      return NextResponse.json(
        { error: `Environment must be one of: ${allowedEnvironments.join(", ")}` },
        { status: 400 }
      );
    }

    // 4. Git branch validation
    const targetBranch = (typeof gitBranch === "string" && gitBranch.trim())
      ? gitBranch.trim()
      : "main";

    // 5. Clean version string (remove leading 'v' if user typed e.g. 'v1.0.1')
    const cleanVersion = version.trim().replace(/^v/, "");

    // Notice: BuildNumber is omitted so backend assigns sequential number
    const coreToken = await getCoreApiToken(adminToken);
    const createdBuild = await createMobileBuild(coreToken, {
      tenantId: tenantId.trim().toLowerCase(),
      version: cleanVersion,
      releaseNotes: typeof releaseNotes === "string" ? releaseNotes.trim() : undefined,
      gitBranch: targetBranch,
      environment: targetEnv,
    });

    // Sanitize any internal filesystem paths before returning to browser
    const sanitizedBuild = {
      ...createdBuild,
      artifactFileName: createdBuild.artifactPath ? createdBuild.artifactPath.split("/").pop() : null,
      artifactPath: undefined,
      isArtifactAvailable: createdBuild.status === "Succeeded" && !!createdBuild.artifactSize,
    };

    return NextResponse.json(sanitizedBuild, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST /api/mobile/builds:", error);
    const statusCode = (error as any)?.statusCode || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create mobile build." },
      { status: statusCode }
    );
  }
}
