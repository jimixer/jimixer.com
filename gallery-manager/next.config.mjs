/** @type {import('next').NextConfig} */
const nextConfig = {
  // 共有パッケージは TypeScript ソースのまま公開しているため
  transpilePackages: ['@jimixer/gallery-schema'],
};

export default nextConfig;
