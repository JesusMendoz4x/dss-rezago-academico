import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';

const server = app.listen(env.port, env.host, () => {
  console.log(`API disponible en http://${env.host}:${env.port}`);
});
server.on('error', (error) => {
  console.error('No se pudo iniciar la API:', error.message);
  process.exitCode = 1;
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  server.close(async () => {
    try {
      await pool.end();
    } catch (error) {
      console.error('Error al cerrar MySQL:', error.message);
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
    }
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
