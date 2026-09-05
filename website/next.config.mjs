/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // S3静的ホスティングのため
  },
  trailingSlash: true,
  // 共有パッケージは TypeScript ソースのまま公開しているため
  transpilePackages: ['@jimixer/gallery-schema'],
};

export default nextConfig;
