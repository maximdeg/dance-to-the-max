import { Layer, ManagedRuntime } from "effect";
import { BillingLive } from "~/services/Billing";
import { DatabaseLive } from "~/services/DatabaseLive";
import { checkHealth, type HealthReport } from "~/services/Health";
import { MailerLive } from "~/services/Mailer";
import { WebhookVerifierLive } from "~/services/StripeWebhooks";
import { VideoProviderLive } from "~/services/VideoProvider";

/**
 * The single server-side Effect runtime. It owns long-lived resources (the DB
 * pool) for the life of the server process. Loaders and actions run their
 * Effects through this runtime.
 */
const AppLayer = Layer.mergeAll(
  DatabaseLive,
  MailerLive,
  VideoProviderLive,
  BillingLive,
  WebhookVerifierLive,
);

export const runtime = ManagedRuntime.make(AppLayer);

export async function runHealthCheck(): Promise<HealthReport> {
  try {
    // Success value is the healthy report. Any failure — a query error, or a
    // misconfigured runtime (e.g. missing DATABASE_URL, which dies while the
    // layer is built and so can't be caught by inner Effect combinators) —
    // rejects here and becomes a clean "unhealthy" report instead of a 500.
    return await runtime.runPromise(checkHealth);
  } catch {
    return {
      status: "unhealthy",
      database: "down",
      timestamp: new Date().toISOString(),
    };
  }
}
