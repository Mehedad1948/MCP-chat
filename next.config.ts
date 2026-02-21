import type { NextConfig } from "next";
import fs from 'fs';
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const nextConfig: NextConfig = {
  env: {
    // 1. Injects the version from package.json
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    
    // 2. Injects the exact time the build was generated
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
