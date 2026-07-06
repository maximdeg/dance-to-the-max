import { runHealthCheck } from "~/runtime.server";

/**
 * Resource route (no UI): returns the health report as JSON. 200 when healthy,
 * 503 otherwise, so uptime checks and load balancers can read the status code.
 */
export async function loader() {
  const report = await runHealthCheck();
  return Response.json(report, {
    status: report.status === "healthy" ? 200 : 503,
  });
}
