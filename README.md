# DSS de rezago académico

Sistema de apoyo al tutor para priorizar el seguimiento semanal de estudiantes. Stack: MySQL, Express, React y Node.js. Se utilizan únicamente datos ficticios.

## Requisitos

- Node.js 24 o superior; se recomienda la versión 24 indicada en `.nvmrc`.
- npm con soporte para workspaces.
- MySQL 8.4 para la carga persistente; no es necesario para ver Resumen y Calidad.

## Instalación en Windows

Abrir PowerShell en la raíz:

```powershell
cd C:\Users\jesus\Documents\Proyectos\dss-rezago-academico
node --version
npm.cmd --version
npm.cmd ci --include=dev
npm.cmd run doctor
npm.cmd run dev
```

`npm ci` instala exactamente las versiones de `package-lock.json` y requiere que ese archivo esté presente. Instala todo desde la raíz, no por separado en client/server. `--include=dev` incluye las herramientas de desarrollo, necesarios para desarrollo. Si agregas o cambias dependencias, usa `npm install` y guarda los cambios de package.json y package-lock.json juntos.

`dev` ejecuta primero el diagnóstico y después inicia la API y el cliente directamente con Node, sin invocar el comando concurrently. Mantén abierta la terminal; Ctrl+C detiene ambos servicios.

- Interfaz: http://localhost:5173
- Calidad: http://localhost:5173/#/calidad
- Estudiantes: http://localhost:5173/#/estudiantes
- API: http://localhost:3001/api/health
- Validación de fuentes: http://localhost:3001/api/quality

El proxy de Vite envía `/api` a Express en el puerto 3001. La pantalla de calidad valida los CSV actuales en memoria; no necesita ejecutar antes `etl` y no confirma una importación en MySQL.

## Configuración MySQL (cuando se vaya a cargar)

```powershell
Copy-Item server/.env.example server/.env
```

Copiar solo si aún no existe, para conservar tus credenciales. Editar `server/.env`, crear el esquema con `database/schema.sql` y ejecutar `npm.cmd run etl:load`. El archivo de entorno se lee desde server independientemente del directorio desde el que arranque Node. No subir `.env` a Git.

## Comandos

| Comando | Función |
|---|---|
| `npm.cmd run doctor` | Comprueba Node y dependencias instaladas |
| `npm.cmd run dev` | API y cliente en desarrollo |
| `npm.cmd run dev:client` | Solo cliente |
| `npm.cmd run dev:server` | Solo API |
| `npm.cmd run build` | Compila React en client/dist |
| `npm.cmd run data:check` | Verifica que los CSV coincidan con su receta |
| `npm.cmd run etl` | Limpieza y evidencias locales |
| `npm.cmd run etl:load` | Limpieza y carga transaccional MySQL |
| `npm.cmd run test:etl` | Pruebas del ETL |

`npm start` inicia únicamente la API; el despliegue del cliente se configurará posteriormente. Esta base es para desarrollo local y todavía no implementa autenticación.

## Archivos de instalación y Git

- Incluir `package.json`, `package-lock.json`, los manifiestos de client/server y `.nvmrc`.
- Incluir ejemplos de entorno y el diagnóstico de instalación.
- Excluir `node_modules/`, `.env`, `dist/` y evidencias generadas, conforme a `.gitignore`.
- Conservar un único package-lock.json en la raíz del workspace.

El comando dev usa scripts/dev.mjs y ya no depende de resolver concurrently en PATH. Si faltan dependencias, ejecutar `npm.cmd ci --include=dev` desde la raíz. Si no se reconoce Node/npm después de instalarlos, cerrar y volver a abrir la terminal. Si los puertos 5173 o 3001 están ocupados, detener la ejecución anterior antes de iniciar otra.

## Organización y avance

`client/`: React/Vite. `server/`: Express, servicios y repositorios. `database/`: esquema MySQL. `data/`: CSV ficticios y referencias. `docs/`: requisitos y procesos.

Implementados: estructura visual, Resumen, Calidad de datos, escenarios configurados y ETL con evidencias/carga transaccional. Estudiantes: filtros, detalle e indicadores descriptivos desde fuentes validadas, con pruebas en `npm.cmd run test:indicators`. Implementados también el índice explicable y la lista priorizada en Resumen, con selección de escenario y filtros. Pendientes: comparación simultánea, parámetros editables, capacidad del tutor y persistencia de recomendaciones. Ver [modelo](docs/modelo-riesgo.md). El índice orientará el acompañamiento; la decisión final corresponde al tutor.

Ver [ETL](docs/etl.md), [arquitectura](docs/arquitectura.md), [diccionario](docs/diccionario-datos.md) y [plan](docs/plan.md).
