import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  async redirects() {
    return [
      {
        source: "/review-monitor/:path*",
        destination: "/host-performance/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
