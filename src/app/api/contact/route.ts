import { z } from "zod";
import { newId, updateStore } from "@/lib/store";

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(150),
  topic: z.string().trim().min(2).max(100),
  message: z.string().trim().min(10).max(2000),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Please check the contact form fields.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const savedAt = new Date().toISOString();
    await updateStore((store) => {
      store.contactSubmissions.push({ id: newId("contact"), ...parsed.data, createdAt: savedAt });
    });
    return Response.json({ message: "Your message was saved in this local demo. No email has been sent." }, { status: 201 });
  } catch (error) {
    console.error("Could not save the local contact request.", error);
    return Response.json({ error: "Your message could not be saved. Please try again." }, { status: 500 });
  }
}
