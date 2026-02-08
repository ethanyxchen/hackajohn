/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["isometric-city"],
    experimental: {
        externalDir: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
