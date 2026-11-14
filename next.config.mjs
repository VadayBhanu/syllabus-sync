/** @type {import('next').NextConfig} */
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  // Static preview build (GitHub Pages): no API routes, served under /syllabus-sync
  ...(staticExport ? { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
  webpack: (config) => {
    // pdf.js has an optional node-only canvas dependency we never use in the browser
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
