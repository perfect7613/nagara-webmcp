import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/f/*" },
      { protocol: "https", hostname: "*.utfs.io", pathname: "/f/*" },
    ],
  },
  transpilePackages: ["tldraw"],
};

export default nextConfig;
