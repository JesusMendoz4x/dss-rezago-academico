import { Router } from 'express';
import { readFile } from 'node:fs/promises';

export const scenariosRouter = Router();
scenariosRouter.get('/', async (req, res) => {
  const file = new URL('../../../config/scenarios.json', import.meta.url);
  const scenarios = JSON.parse(await readFile(file, 'utf8'));
  res.json({ data: scenarios });
});
