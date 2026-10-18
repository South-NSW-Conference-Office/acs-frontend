const DEFAULT_PRODUCTION_API_URL = 'https://api.communityservices.org.au';
const DEFAULT_DEVELOPMENT_API_URL = 'http://localhost:5001';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_API_URL
    : DEFAULT_DEVELOPMENT_API_URL);

export const API_ROOT_URL = `${API_BASE_URL}/api`;
