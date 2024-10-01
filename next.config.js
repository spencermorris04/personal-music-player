// next.config.js

import withSerwistInit from '@serwist/next';

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add other Next.js configurations here if needed
};

// Initialize serwist with your service worker configurations
const withSerwist = withSerwistInit({
  swSrc: 'public/sw.ts',     // Path to your custom service worker source
  swDest: 'public/sw.js',     // Destination path for the compiled service worker
});

export default withSerwist(nextConfig);
