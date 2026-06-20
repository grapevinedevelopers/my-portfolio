import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      { // Add LinkedIn CDN hostname
        protocol: 'https',
        hostname: 'media.licdn.com',
        port: '',
        pathname: '/**',
      },
      { // Add imgsrv2.voi.id hostname
        protocol: 'https',
        hostname: 'imgsrv2.voi.id',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
