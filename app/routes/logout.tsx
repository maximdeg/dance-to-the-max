import { redirect } from "react-router";
import { endSession } from "~/auth/auth.server";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  const cookie = await endSession(request);
  return redirect("/login", { headers: { "Set-Cookie": cookie } });
}

// Logging out is a POST-only action; a stray GET just goes home.
export async function loader() {
  return redirect("/");
}
