/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.alias['@'] = require('path').resolve(__dirname);

    // Ably uses dynamic requires internally which triggers a webpack warning.
    // Marking it as an external for the server bundle silences this cleanly.
    if (isServer) {
      config.externals = [...(config.externals || []), 'ably'];
    }

    return config;
  },
};

module.exports = nextConfig;
