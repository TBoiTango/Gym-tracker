/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Unique per-deploy ID used to bust the PWA service worker cache.
    // Vercel sets VERCEL_GIT_COMMIT_SHA automatically; fall back to timestamp for local dev.
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
      String(Date.now()),
  },
};

module.exports = nextConfig;
