// components/VersionInfo.tsx

export default function VersionInfo() {
  // Read the variables we injected at build time
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
  
  // Format the build time to be readable
  const rawBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const buildDate = rawBuildTime 
    ? new Date(rawBuildTime).toLocaleString() 
    : 'Local Development';

  // Get the Git Commit SHA (Vercel specific, gracefully fallback if not present)
  const fullCommitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  // It's standard practice to only show the first 7 characters of a Git hash
  const shortCommit = fullCommitSha ? fullCommitSha.slice(0, 7) : 'local';

  return (
    <div className="fixed bottom-2 right-2 flex flex-col items-end text-xs text-gray-500 opacity-75 hover:opacity-100 transition-opacity bg-white/80 p-2 rounded shadow-sm border">
      <span className="font-mono font-semibold">
        v{appVersion} ({shortCommit})
      </span>
      <span className="text-[10px]">
        Built: {buildDate}
      </span>
    </div>
  );
}
