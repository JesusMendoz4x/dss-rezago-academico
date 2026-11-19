import { Router } from 'express';
import { pool } from '../../config/database.js';

export const healthRouter = Router();
healthRouter.get('/', (req, res) => {
  res.json({ data: { status: 'ok', service: 'dss-rezago-academico' } });
});
healthRouter.get('/database', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ data: { status: 'ok', database: 'mysql' } });
  } catch (error) {
    console.error('Comprobaci?n MySQL:', error.code || error.message);
    res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'MySQL no disponible' } });
  }
});
