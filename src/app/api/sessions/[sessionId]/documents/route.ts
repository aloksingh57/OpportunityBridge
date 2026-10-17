import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireActor } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { newId, updateStore } from "@/lib/store";
import type { SessionDocument } from "@/types/opportunity-bridge";

const maximumFileSize = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  let actor;
  try {
    actor = await requireActor();
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return Response.json({ error: "Choose a demo profile before sharing a document." }, { status: 401 });
    }
    throw error;
  }
  const limit = consumeRateLimit(`document-uploads:${actor.id}`, 10, 60 * 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many document uploads. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const { sessionId } = await params;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maximumFileSize + 64 * 1024) {
    return Response.json({ error: "PDF files must be 5 MB or smaller." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Choose a valid PDF document to upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") return Response.json({ error: "Choose a PDF document to upload." }, { status: 400 });
  if (file.size <= 0 || file.size > maximumFileSize || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    return Response.json({ error: "Upload a non-empty PDF file of 5 MB or smaller." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 8 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return Response.json({ error: "The file content does not appear to be a valid PDF." }, { status: 400 });
  }

  const documentId = newId("session-document");
  const directory = path.join(process.cwd(), ".data", "private-documents");
  const diskPath = path.join(directory, `${documentId}.pdf`);
  const fileName = file.name.replace(/[\u0000-\u001f\u007f\\/]/g, "_").trim().slice(0, 120) || "document.pdf";
  const document: SessionDocument = {
    id: documentId,
    sessionId,
    ownerId: actor.id,
    fileName,
    mimeType: "application/pdf",
    size: bytes.length,
    createdAt: new Date().toISOString(),
  };

  try {
    const sessionExists = await updateStore((store) => {
      const session = store.mentoringSessions.find((item) => item.id === sessionId);
      if (!session) return false;
      if (session.requesterId !== actor.id) return false;
      if (session.serviceType !== "cv-review" && session.serviceType !== "pitch-review") return false;
      if (session.status !== "requested" && session.status !== "accepted") return false;
      return true;
    });
    if (!sessionExists) return Response.json({ error: "A document can only be attached to your active CV or pitch review request." }, { status: 403 });
    await mkdir(directory, { recursive: true });
    await writeFile(diskPath, bytes, { flag: "wx", mode: 0o600 });
    try {
      await updateStore((store) => {
        const session = store.mentoringSessions.find((item) => item.id === sessionId);
        if (!session || session.requesterId !== actor.id || (session.status !== "requested" && session.status !== "accepted")) {
          throw new Error("SESSION_DOCUMENT_ACCESS_CHANGED");
        }
        store.sessionDocuments.push(document);
      });
    } catch (error) {
      await unlink(diskPath).catch((cleanupError: unknown) => {
        console.error("Could not remove an unlinked session document.", cleanupError);
      });
      if (error instanceof Error && error.message === "SESSION_DOCUMENT_ACCESS_CHANGED") {
        return Response.json({ error: "This review request is no longer available for document sharing." }, { status: 403 });
      }
      throw error;
    }
    return Response.json({ document: { ...document, downloadUrl: `/api/session-documents/${document.id}` } }, { status: 201 });
  } catch (error) {
    console.error("Could not save a private session document.", error);
    return Response.json({ error: "The private document could not be saved. Please try again." }, { status: 500 });
  }
}
