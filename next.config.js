/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.steamstatic.com' },
      { protocol: 'https', hostname: '*.akamaihd.net' },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias['@'] = require('path').resolve(__dirname);
    return config;
  },
};

module.exports = nextConfig;
