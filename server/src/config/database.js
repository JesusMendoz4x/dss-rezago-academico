import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  ...env.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 5000,
  charset: 'utf8mb4',
  timezone: 'Z',
});
