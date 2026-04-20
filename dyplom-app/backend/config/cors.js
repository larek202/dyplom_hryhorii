/**
 * CORS: Vite dev + optional extra origins from CORS_ORIGIN (comma-separated).
 * Production: only origins listed in CORS_ORIGIN (set your real HTTPS domain there).
 */

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const DEV_DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function buildAllowedOrigins() {
  const fromEnv = parseOrigins(process.env.CORS_ORIGIN);
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!fromEnv.length) {
      console.warn(
        '⚠️ CORS: NODE_ENV=production but CORS_ORIGIN is empty — cross-origin browser requests will be blocked. Set CORS_ORIGIN=https://your-domain.com'
      );
    }
    return fromEnv;
  }

  return [...new Set([...DEV_DEFAULT_ORIGINS, ...fromEnv])];
}

function createCorsOptions() {
  const allowedOrigins = buildAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.length === 0) {
        callback(null, false);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
}

module.exports = { createCorsOptions, buildAllowedOrigins };
