/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/genre/拘束',
        destination: '/genre/restraint',
        permanent: true,
      },
      // 他のジャンルも同様に
    ]
  },
}
export default nextConfig;