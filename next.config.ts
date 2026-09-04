import type { NextConfig } from "next";

const isGitHubPagesStaticDemo = process.env.GITHUB_PAGES === "true"
  && process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  ...(isGitHubPagesStaticDemo
    ? {
        output: "export" as const,
        basePath: "/gridbrief-tr",
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
