import { Context, Effect, Layer } from "effect";

/** A password-reset email: the recipient and the raw (unhashed) reset token. */
export interface PasswordResetEmail {
  readonly to: string;
  readonly token: string;
}

/**
 * The outbound email sender, behind an interface so a hosted provider can be
 * swapped in later and tests can stub it. Sending is best-effort and never
 * fails the caller's request.
 */
export interface MailerService {
  readonly sendPasswordReset: (
    email: PasswordResetEmail,
  ) => Effect.Effect<void>;
}

export class Mailer extends Context.Tag("app/Mailer")<
  Mailer,
  MailerService
>() {}

/**
 * Placeholder Mailer until a hosted email provider is wired in. It logs that a
 * reset was requested but deliberately NOT the token, so live tokens never land
 * in server logs.
 */
export const MailerLive = Layer.succeed(Mailer, {
  sendPasswordReset: ({ to }) =>
    Effect.sync(() => {
      console.info(`[mailer] password reset requested for ${to}`);
    }),
});
