import { getBootstrap } from "@/lib/bootstrap";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  try {
    return Response.json(await getBootstrap(cookieHeader), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Could not load the OpportunityBridge demo data.", error);
    return Response.json({ error: "Demo data could not be loaded. Check that the local data folder is writable." }, { status: 500 });
  }
}
