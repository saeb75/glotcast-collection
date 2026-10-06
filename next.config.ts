import path from "node:path"
import type { NextConfig } from "next"

// In development the panel calls `/v1/…` on its own origin and Next forwards it to the local API (no CORS);
// a built panel calls NEXT_PUBLIC_API_URL directly (the API's CORS_ORIGINS must list the panel's origin).
const devApi = process.env.API_PROXY_URL || "http://localhost:3000"

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: { root: path.join(__dirname) },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return []
    return [{ source: "/v1/:path*", destination: `${devApi}/v1/:path*` }]
  },
}

export default nextConfig
