import { getAdminActionContext } from "@/lib/admin";

// Admin-only: fails on purpose, so the owner can confirm that production errors reach the
// error tracker (NFR-OPS-04). Everyone else gets a plain 404.
export async function GET() {
  if (!(await getAdminActionContext())) return new Response(null, { status: 404 });
  throw new Error("Sentry test error (triggered by an admin via /admin/sentry-test)");
}
