/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Utiliser standalone pour Docker en production
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
}

module.exports = nextConfig

