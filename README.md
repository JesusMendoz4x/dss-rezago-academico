# DSS de rezago acad?mico

Sistema de apoyo al tutor para priorizar el seguimiento semanal de estudiantes. Basado en `Proyecto_Rezago_Academico.docx`.

Stack: **MySQL, Express, React y Node.js**, con JavaScript y m?dulos ES. Cliente React con Vite, API Express y conexi?n MySQL mediante mysql2. Se recomienda Node.js 24 LTS y MySQL 8.4.

## Estado

API de salud, escenarios, conexión MySQL y pantalla inicial React. ETL implementado con evidencias locales y carga transaccional. Indicadores, clasificación y vistas de análisis siguen pendientes. Los datos disponibles son completamente ficticios.

## Instalaci?n

Desde la ra?z, en PowerShell:

```powershell
npm install
Copy-Item server/.env.example server/.env
```

Editar `server/.env` con las credenciales locales. Crear una base vac?a y cargar `database/schema.sql` desde MySQL Workbench o el cliente MySQL. El script crea la base `dss_rezago_academico` y las tablas si no existen; no borra datos. Usar una cuenta de aplicaci?n con permisos limitados a esa base.

```powershell
npm run dev
```

- Cliente: http://localhost:5173
- API: http://localhost:3001/api/health
- Conexi?n MySQL: http://localhost:3001/api/health/database
- Escenarios: http://localhost:3001/api/scenarios

Vite redirige `/api` al servidor durante desarrollo. La API puede iniciar sin MySQL; la ruta de base de datos responder? 503 si no logra conectar.

## Comandos

```powershell
npm run dev:client
npm run dev:server
npm run build
npm start
```

`build` genera `client/dist`. `start` inicia ?nicamente la API. Para producci?n hay que servir el cliente y redirigir `/api` con un servidor web; esa configuraci?n queda pendiente. No hay autenticaci?n implementada y esta base est? destinada al desarrollo local.

## Organizaci?n

```text
client/                 React + Vite
  src/components/       Componentes reutilizables
  src/pages/            Pantallas
  src/services/         Acceso a la API
  src/styles/           Estilos
server/
  src/config/           Entorno y pool MySQL
  src/middleware/       Errores y rutas inexistentes
  src/modules/          Salud, escenarios y futuros m?dulos DSS
  src/services/         ETL, indicadores y modelo de decisi?n
  src/repositories/     Consultas y persistencia
  config/               Escenarios versionados
  tests/                Espacio para pruebas futuras
  scripts/              Comandos de datos y ETL
 database/              Esquema MySQL y futuras migraciones
 data/                  Fuentes CSV, datos preparados y rechazos
 docs/                  Arquitectura, diccionario y plan de trabajo
```

Solo se utilizar?n datos ficticios y c?digos de estudiante. El ?ndice orientar? el acompa?amiento; la decisi?n final ser? del tutor.

Consultar [arquitectura](docs/arquitectura.md), [diccionario](docs/diccionario-datos.md) y [plan de trabajo](docs/plan.md).

## ETL

Ejecutar `npm run etl` para producir datos limpios y evidencias; `npm run etl:load` para cargar MySQL y `npm run test:etl` para validar. Ver [proceso ETL](docs/etl.md).
