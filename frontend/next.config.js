/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Utiliser standalone pour Docker en production
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // URL de l'API exposée au frontend
  // - En développement: définir NEXT_PUBLIC_API_URL manuellement (ex: http://localhost:8000)
  // - En Docker / production: on pointe par défaut sur le service backend du compose
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000',
  },
}

module.exports = nextConfig

