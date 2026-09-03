import type { NextConfig } from "next";

const isGitHubPagesStaticDemo = process.env.GITHUB_PAGES === "true"
  && process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(isGitHubPagesStaticDemo
    ? {
        output: "export" as const,
        basePath: "/gridbrief-tr",
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
