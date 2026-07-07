import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Pre-login funnel — wrapped in the shared public header/layout.
  layout("routes/public-layout.tsx", [
    index("routes/home.tsx"),
    route("ballroom", "routes/ballroom.tsx"),
    route("nosotros", "routes/nosotros.tsx"),
    route("comentarios", "routes/comentarios.tsx"),
    route("contacto", "routes/contacto.tsx"),
  ]),
  route("signup", "routes/signup.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("account/password", "routes/account.password.tsx"),
  route("account/subscription", "routes/account.subscription.tsx"),
  route("locale", "routes/locale.tsx"),
  route("catalog", "routes/catalog.tsx"),
  route("catalog/:danceId", "routes/catalog.$danceId.tsx"),
  route("catalog/:danceId/:videoId", "routes/catalog.$danceId.$videoId.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("checkout/success", "routes/checkout.success.tsx"),
  route("webhooks/stripe", "routes/webhooks.stripe.ts"),
  route("admin/accounts", "routes/admin.accounts.tsx"),
  route("admin/dances", "routes/admin.dances.tsx"),
  route("admin/dances/:danceId", "routes/admin.dances.$danceId.tsx"),
  route("admin/videos/:videoId", "routes/admin.videos.$videoId.tsx"),
  route("admin/tags", "routes/admin.tags.tsx"),
  route("healthz", "routes/healthz.ts"),
] satisfies RouteConfig;
