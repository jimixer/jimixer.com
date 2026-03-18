/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions を使用するため output: 'export' は設定しない
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001"],
    },
  },
};

export default nextConfig;
