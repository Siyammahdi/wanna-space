import { buildExport } from "@/features/settings/server/export";

export async function GET() {
  const data = await buildExport();
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="wanna-space-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
