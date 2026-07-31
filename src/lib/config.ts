// The fallback must match the backend's actual port (5000 - see the
// acs-backend Dockerfile's EXPOSE/PORT and its .env). This previously
// defaulted to 5001, so teamImageService - the only consumer of this module -
// targeted a different origin than every other API call whenever
// NEXT_PUBLIC_API_BASE_URL was not set. Note it is a NEXT_PUBLIC_* variable,
// so it is compiled into the client bundle and must be supplied as a Docker
// build arg, not at runtime.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';