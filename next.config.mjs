/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdf.js has an optional node-only canvas dependency we never use in the browser
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
