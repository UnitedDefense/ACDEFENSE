import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // "Request a Class" moved into the unified request page (2026-10 redesign).
      { source: "/waitlist", destination: "/request-training?type=waitlist", permanent: true },
    ];
  },
};

export default nextConfig;
