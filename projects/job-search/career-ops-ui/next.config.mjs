/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['playwright', 'playwright-core'],
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'playwright-core'],
  },
}

export default nextConfig
