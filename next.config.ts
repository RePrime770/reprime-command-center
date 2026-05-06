import type { NextConfig } from "next";

// Pin Turbopack's workspace root to this directory. Without this, Next 16 walks
// up to C:\reprime-command-center\ (which has its own package-lock.json) and
// emits a workspace-root inference warning + fails to resolve modules that live
// only in dashboard/node_modules (playwright-core, @sparticuz/chromium).
// `process.cwd()` is the build-time CWD, which is always the dashboard dir
// (Vercel and `npm run build` both invoke from this directory).
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
