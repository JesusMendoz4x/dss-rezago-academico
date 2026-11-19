import { createRequire } from 'node:module';

const major = Number(process.versions.node.split('.')[0]);
const missing = [];
const checks = [
  ['../client/package.json', 'vite'],
  ['../client/package.json', '@vitejs/plugin-react'],
  ['../client/package.json', 'react'],
  ['../client/package.json', 'react-dom'],
  ['../server/package.json', 'express'],
  ['../server/package.json', 'mysql2'],
  ['../server/package.json', 'dotenv'],
];

if (major < 24) {
  console.error(`Node.js ${process.versions.node} no cumple el mínimo del proyecto. Instala Node.js 24 o superior.`);
  process.exitCode = 1;
}

for (const [workspace, dependency] of checks) {
  try {
    createRequire(new URL(workspace, import.meta.url)).resolve(dependency);
  } catch {
    missing.push(dependency);
  }
}

if (missing.length) {
  console.error(`Faltan dependencias: ${missing.join(', ')}`);
  console.error('Desde la raíz ejecuta: npm.cmd ci --include=dev');
  process.exitCode = 1;
}
if (!process.exitCode) {
  console.log(`Instalación lista. Node.js ${process.versions.node}; dependencias del cliente y servidor encontradas.`);
  console.log('MySQL no es necesario para consultar Resumen y Calidad de datos.');
}
