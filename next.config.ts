import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photo scan + image uploads post a base64 image through a server action. The
    // default cap is 1 MB; base64 inflates ~4/3, so allow headroom above our 4 MB
    // decoded-image cap (see src/lib/images/validate.ts).
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
