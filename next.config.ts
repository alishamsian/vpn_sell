import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  turbopack: {
    root: rootDirectory,
  },
};

export default nextConfig;
