# ETL de rezago académico

Implementado en la rama `feat/datos-simulados-rezago`. El núcleo utiliza únicamente Node.js; la carga MySQL requiere las dependencias del servidor.

## Ejecución y demostración

Desde la raíz:

```powershell
npm run etl
npm run test:etl
```

El primer comando extrae los cuatro CSV, transforma y valida, y publica tablas limpias y evidencia local. No necesita MySQL ni instalar dependencias. El segundo ejecuta las pruebas con el runner de Node.js.

Para completar la carga MySQL:

1. Instalar dependencias con `npm install` y crear el esquema con `database/schema.sql`.
2. Copiar `server/.env.example` a `server/.env` y configurar credenciales.
3. Ejecutar `npm run etl:load`.

La cuenta necesita permisos SELECT, INSERT y UPDATE en las tablas del proyecto. No se ejecutan migraciones ni cambios de esquema automáticamente.

## Evidencias

Se publican en `data/etl-runs/<huella>/` y están excluidas de Git:

- `manifest.json`: hashes SHA-256 de los CSV y parámetros del ETL.
- `clean/`: los cuatro CSV normalizados.
- `provenance.json`: filas limpias y número de línea original.
- `quality-report.json`: conteos por archivo y totales.
- `rejected/anomalies.csv`: correcciones, rechazos, duplicados y conflictos, con archivo, línea, campo, original, normalizado y motivo.
- `rejected/records.json`: contenido completo de las filas rechazadas o en conflicto.

La huella depende de los bytes originales, periodo, corte, grupos y versión del ETL. No depende del reloj ni lee las referencias para decidir qué aceptar. Repetir las mismas entradas verifica la evidencia existente; una diferencia detectada hace fallar el proceso. La publicación usa una carpeta temporal y renombrado para evitar resultados parciales. Ejecuciones simultáneas locales pueden requerir reintentar si compiten al publicar la misma carpeta.

## Proceso verificable

1. **Extracción:** CSV UTF-8, BOM opcional, CRLF/LF, comillas, comas y campos multilínea. Encabezados incorrectos, archivos ausentes, codificación inválida o CSV mal formado detienen la ejecución. Las filas con distinto número de columnas se rechazan; líneas vacías se ignoran.
2. **Transformación:** espacios exteriores, códigos e-1/E0001 → E-0001, fechas DD/MM/AA o DD/MM/AAAA → ISO, booleanos explícitos y calificaciones con dos decimales. Se registra cada campo corregido de una fila finalmente aceptada.
3. **Validación:** catálogo de estudiantes/grupos, campos obligatorios, longitudes compatibles con MySQL, fechas reales dentro del periodo y notas 0 a 10. Asistencia/evaluaciones posteriores al corte se rechazan. Entregas futuras dentro del periodo son válidas; el indicador posterior deberá excluir las no vencidas.
4. **Duplicados:** se compara la fila normalizada. Conservar uno si todos los valores coinciden; registrar descarte. Ante valores contradictorios, poner todas las versiones de la clave en cuarentena. Un estudiante en conflicto tampoco puede aparecer en hechos aceptados.
5. **Disponibilidad local:** CSV limpios con procedencia y reportes. Con `--load`, además carga transaccional MySQL.

Los faltantes no se sustituyen por cero. Se conserva a los estudiantes sin sesiones, evaluaciones o entregas; la suficiencia de datos se evaluará en indicadores/modelo.

## Resultado esperado del fixture v1.0.0

| Fuente | Leídos | Aceptados | Corregidos* | Rechazados | Duplicados | Conflictos |
|---|---:|---:|---:|---:|---:|---:|
| estudiantes | 30 | 30 | 0 | 0 | 0 | 0 |
| asistencia | 699 | 693 | 3 | 5 | 1 | 0 |
| evaluaciones | 115 | 111 | 1 | 4 | 0 | 0 |
| entregas | 301 | 300 | 1 | 1 | 0 | 0 |
| **Total** | **1145** | **1134** | **5** | **10** | **1** | **0** |

*Corregidos es un subconjunto de aceptados. Leídos = aceptados + rechazados + duplicados + conflictos. Las anomalías son eventos por campo/fila; no necesariamente suman lo mismo que los registros afectados. En este fixture hay 16 eventos.

Para mostrar la rúbrica: comparar la línea 2 de asistencia (`e-1`) con el CSV limpio (`E-0001`); mostrar la nota 11 rechazada con motivo; presentar conteos y cargar el lote. Las pruebas comparan los cuatro resultados con las referencias y comprueban casos inválidos, conflictos, reproducción y control de transacciones.

## Carga MySQL y trazabilidad

En una transacción: lote, catálogo compatible, asistencia, evaluaciones, entregas, anomalías y estado completado. Consultas parametrizadas. Cada hecho conserva archivo y línea de origen. El lote guarda hashes, parámetros, catálogo normalizado y reporte de calidad.

Un bloqueo de MySQL por huella evita cargas simultáneas idénticas. Un lote idéntico ya completado devuelve su ID sin insertar de nuevo. Entradas distintas crean un lote diferente: las consultas posteriores deben seleccionar explícitamente un lote para no mezclar periodos ni duplicar conteos. No modificar o borrar manualmente lotes completados; la reutilización asume que permanecen íntegros.

El catálogo es compartido: si un código existente tiene otro grupo o programa, la carga falla y se revierte para no modificar el historial. La evolución del catálogo requerirá un diseño por periodo. Fallos de carga no dejan un lote parcial; las evidencias locales permanecen disponibles para corregir el problema y reintentar. El error se informa por terminal, sin prometer un lote fallido persistente tras el rollback.

## Validación pendiente en infraestructura

Node.js y MySQL no están disponibles en la terminal de creación. Las pruebas automatizadas se incluyen para ejecutarlas con Node.js 24. Ocho pruebas del núcleo y del repositorio pasaron en V8, usando las mismas pruebas de Node con adaptadores de lectura y aserciones. Incluyen comparación de referencias y conexión MySQL simulada. La prueba de archivos locales de la suite Node y la integración con una instancia MySQL real siguen pendientes. No se ha implementado todavía el cálculo de indicadores, el índice de riesgo ni la interfaz para visualizar la calidad.
