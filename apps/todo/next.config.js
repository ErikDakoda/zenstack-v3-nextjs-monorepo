const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@erikdakoda/auth',
    '@erikdakoda/auth-ui',
    '@erikdakoda/database',
    '@erikdakoda/todo',
    '@erikdakoda/todo-ui',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  env: {
    APP_VERSION: process.env.npm_package_version,
  },
};

export default nextConfig;
