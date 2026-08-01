import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Required for correct tracing of workspace packages in monorepo when producing standalone output.
  // The tracing root is the monorepo root so local @paysave/* packages are included in the artifact.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
};

export default nextConfig;
