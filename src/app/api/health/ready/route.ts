import { getReadinessReport } from "@/lib/runtime-mode";

export async function GET() {
  const report = getReadinessReport();
  return Response.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
