/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable if needed for better JavaScript support
  },
  webpack: (config, { isServer }) => {
    // Handle vm2 and other Node.js modules
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'vm2': 'commonjs vm2'
      });
    }
    
    return config;
  }
}

module.exports = nextConfig