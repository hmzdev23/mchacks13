/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent double MediaPipe initialization
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Use credentialless instead of require-corp to allow CDN resources
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  // Ignore MediaPipe packages in webpack bundling (they load from CDN)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    // Externalize MediaPipe to prevent bundling issues
    config.externals = config.externals || [];
    return config;
  },
};

module.exports = nextConfig;
