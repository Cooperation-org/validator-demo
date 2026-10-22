import { configure } from '@modern-js/plugin-bff/client';

// BFF functions are called at /api/... from the site root. When the app is
// served under a path prefix (APP_BASE_PATH, e.g. /validator-demo), send them to
// <prefix>/api/... instead; the reverse proxy routes that to the app's /api/.
const basePath = process.env.APP_BASE_PATH;

if (basePath) {
  configure({
    interceptor: (request) => async (url, params) => {
      const prefixed =
        typeof url === 'string' && url.startsWith('/')
          ? `${basePath}${url}`
          : url;
      const response = await request(prefixed, params);
      // Interceptors receive the raw Response; BFF callers expect the parsed body.
      return response instanceof Response ? response.json() : response;
    },
  });
}
