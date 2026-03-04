import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.ap-southeast-2.wasabisys.com',
        pathname: '/adventistcommunityservices/**',
      },
      {
        protocol: 'https',
        hostname: 's3.ap-southeast-2.wasabisys.com',
        pathname: '/alertison/**',
      },
      // Add any other image domains you need
    ],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: false,
    unoptimized: false,
  },
};

export default nextConfig;
