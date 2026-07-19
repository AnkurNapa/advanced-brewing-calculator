/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const repoName = 'advanced-brewing-calculator';

const nextConfig = {
  output: 'export',
  // Only apply basePath/assetPrefix in production builds so `npm run dev`
  // still works at the site root ("/") during local development.
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
