import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/f/*" },
      { protocol: "https", hostname: "*.utfs.io", pathname: "/f/*" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  transpilePackages: ["tldraw", "@xyflow/react"],
};

export default nextConfig;
