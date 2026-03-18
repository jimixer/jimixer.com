/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // S3静的ホスティングのため
  },
  trailingSlash: true,
};

export default nextConfig;
