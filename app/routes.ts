import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("signup", "routes/signup.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("account/password", "routes/account.password.tsx"),
  route("catalog", "routes/catalog.tsx"),
  route("catalog/:danceId", "routes/catalog.$danceId.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("admin/dances", "routes/admin.dances.tsx"),
  route("admin/dances/:danceId", "routes/admin.dances.$danceId.tsx"),
  route("admin/videos/:videoId", "routes/admin.videos.$videoId.tsx"),
  route("admin/tags", "routes/admin.tags.tsx"),
  route("healthz", "routes/healthz.ts"),
] satisfies RouteConfig;
