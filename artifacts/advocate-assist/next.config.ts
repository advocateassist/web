import type { NextConfig } from "next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN ?? "";
const replitDomains = process.env.REPLIT_DOMAINS ?? "";

const allowedOrigins = [
  "*.replit.dev",
  "*.pike.replit.dev",
  "*.repl.co",
  ...(replitDomain ? [replitDomain] : []),
  ...(replitDomains ? replitDomains.split(",").map((d) => d.trim()) : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
};

export default nextConfig;
