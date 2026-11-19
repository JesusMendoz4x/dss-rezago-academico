import 'dotenv/config';

function port(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} debe ser un puerto v?lido`);
  }
  return value;
}

export const env = Object.freeze({
  host: process.env.HOST || '127.0.0.1',
  port: port('PORT', 3001),
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: port('DB_PORT', 3306),
    user: process.env.DB_USER || 'dss_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dss_rezago_academico',
  },
});
