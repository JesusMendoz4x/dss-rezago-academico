import express from 'express';
import { recommendationsRouter } from './modules/recommendations/recommendations.routes.js';
import { studentsRouter } from './modules/students/students.routes.js';
import { qualityRouter } from './modules/quality/quality.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { scenariosRouter } from './modules/scenarios/scenarios.routes.js';
import { errorHandler, notFound } from './middleware/errors.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use('/api/health', healthRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/quality', qualityRouter);
app.use('/api/students', studentsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use(notFound);
app.use(errorHandler);
