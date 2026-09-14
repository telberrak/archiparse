/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Utiliser standalone pour Docker en production
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // URL de l'API appelée depuis le navigateur (pas depuis le réseau Docker).
  // Le hostname "backend" n'est résolu qu'entre conteneurs — le navigateur
  // doit viser le port publié sur la machine hôte (localhost:8000).
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
}

module.exports = nextConfig

