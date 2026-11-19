import express from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { scenariosRouter } from './modules/scenarios/scenarios.routes.js';
import { errorHandler, notFound } from './middleware/errors.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use('/api/health', healthRouter);
app.use('/api/scenarios', scenariosRouter);
app.use(notFound);
app.use(errorHandler);
