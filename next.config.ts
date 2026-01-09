import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // webpack: (config) => {
  //   config.externals.push({
  //     "pg-native": "commonjs pg-native",
  //     sharpt: "commonjs sharp", // (Optional: good practice if you use image processing later)
  //   });
  //   return config;
  // },
};

export default nextConfig;
