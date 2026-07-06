import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Server-side render by default; the Vercel preset packages the server build
  // as serverless functions when deploying to Vercel.
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
