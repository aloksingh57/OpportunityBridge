import { readFile } from "node:fs/promises";
import path from "node:path";
import { getActor } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const actor = await getActor();
  if (!actor || actor.isAdmin) {
    return Response.json({ error: "Sign in with an authorized session participant to access this document." }, { status: 401 });
  }
  const limit = consumeRateLimit(`document-downloads:${actor.id}`, 60, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many document downloads. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const { documentId } = await params;
  const store = await readStore();
  const document = store.sessionDocuments.find((item) => item.id === documentId);
  if (!document) return Response.json({ error: "That private document could not be found." }, { status: 404 });
  const session = store.mentoringSessions.find((item) => item.id === document.sessionId);
  if (!session) return Response.json({ error: "That private document is no longer available." }, { status: 404 });
  const isBlocked = store.userBlocks.some((block) =>
    (block.blockerId === session.requesterId && block.blockedUserId === session.providerId)
    || (block.blockerId === session.providerId && block.blockedUserId === session.requesterId),
  );
  if (isBlocked) return Response.json({ error: "This private document is no longer available." }, { status: 403 });
  const isOwner = document.ownerId === actor.id && session.requesterId === actor.id;
  const isApprovedProvider = session.providerId === actor.id && (session.status === "accepted" || session.status === "completed");
  if (!isOwner && !isApprovedProvider) {
    return Response.json({ error: "You do not have permission to access this private document." }, { status: 403 });
  }

  try {
    const bytes = await readFile(path.join(process.cwd(), ".data", "private-documents", `${document.id}.pdf`));
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Could not load a private session document.", error);
    return Response.json({ error: "This document is temporarily unavailable." }, { status: 500 });
  }
}
