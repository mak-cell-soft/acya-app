import { NextResponse } from "next/server";
import { 
  getAdminAuthToken, 
  getCoreApiToken, 
  fetchTenantFirebaseApp, 
  provisionTenantFirebaseApp 
} from "@/lib/mobileBackend";

const SLUG_REGEX = /^[a-zA-Z0-9_-]{2,64}$/;

function isValidSlug(slug: string): boolean {
  return typeof slug === "string" && SLUG_REGEX.test(slug.trim());
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  let targetSlug = "unknown";
  try {
    const { slug } = await params;
    targetSlug = slug;

    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json(
        { error: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "Invalid tenant slug format. Must be alphanumeric with '-' or '_' (2-64 characters)." },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase();
    const coreToken = await getCoreApiToken(adminToken);
    const appStatus = await fetchTenantFirebaseApp(coreToken, cleanSlug);

    if (!appStatus) {
      return NextResponse.json(
        { error: `Tenant '${cleanSlug}' not found in Firebase registry.` },
        { status: 404 }
      );
    }

    return NextResponse.json(appStatus);
  } catch (error: unknown) {
    console.error(`Error in GET /api/mobile/firebase/${targetSlug}:`, error);
    const message = error instanceof Error ? error.message : "Failed to retrieve Firebase application status.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  let targetSlug = "unknown";
  try {
    const { slug } = await params;
    targetSlug = slug;

    const adminToken = await getAdminAuthToken(request.headers);
    if (!adminToken) {
      return NextResponse.json(
        { error: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "Invalid tenant slug format. Must be alphanumeric with '-' or '_' (2-64 characters)." },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase();
    const coreToken = await getCoreApiToken(adminToken);

    // Forward ONLY the validated slug. Never accept client-supplied project ID or package name.
    const result = await provisionTenantFirebaseApp(coreToken, cleanSlug);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error(`Error in POST /api/mobile/firebase/${targetSlug}:`, error);
    const statusCode = (error as { statusCode?: number })?.statusCode || 500;
    const message = error instanceof Error ? error.message : "Failed to register Firebase application.";
    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
}
