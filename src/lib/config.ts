// Where the API lives.
//
// The fallback must match the backend's actual port (5000 — see the acs-backend
// Dockerfile's EXPOSE/PORT and its .env). This previously defaulted to 5001, so
// teamImageService targeted a different origin than every other API call whenever
// NEXT_PUBLIC_API_BASE_URL was not set.
//
// NEXT_PUBLIC_* variables are inlined at *build* time, not read at runtime, so this
// has to be supplied as a Docker build arg — see the build-args block in
// .github/workflows/docker-deploy-production.yml. Setting it in the container's
// environment after the fact does nothing.
//
// That build-time inlining is what makes a missing value so nasty. Most call sites
// used to read process.env directly with no fallback, so an unset variable was
// interpolated as the literal string "undefined":
//
//     POST http://localhost:3001/undefined/api/auth/signin  ->  404
//
// Every request in the panel fails with a 404 that names no cause, and the build
// that produced it succeeded quietly. Hence the check below: in a production build
// this throws and stops the build, which is far cheaper than discovering it after
// deploy. In development it falls back and says so.

function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configured) {
    // A trailing slash would produce "https://api.example.com//api/..." — harmless
    // on some servers, a 404 on others. Cheap to normalise, tedious to debug.
    return configured.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is not set. It is inlined at build time, so it must ' +
        'be passed as a Docker build arg (see the build-args block in ' +
        '.github/workflows/docker-deploy-production.yml). Without it every request ' +
        'is sent to "/undefined/api/..." and returns 404, which presents as the ' +
        'entire admin panel being broken for no visible reason.'
    );
  }

  const fallback = 'http://localhost:5000';
  console.warn(
    `[config] NEXT_PUBLIC_API_BASE_URL is not set; falling back to ${fallback}. ` +
      'Set it in .env.local if the API is somewhere else.'
  );
  return fallback;
}

export const API_BASE_URL = resolveApiBaseUrl();
