# Diccionario de datos v1.0.0

Fuentes simuladas CSV UTF-8, separador coma y encabezados obligatorios. Fechas normalizadas AAAA-MM-DD. Periodo 2026-02-02 a 2026-03-27; corte 2026-03-13. Ver `data/README.md` y `data/dataset-spec.json`.

| Campo | Tipo | Fuente | Regla |
|---|---|---|---|
| id_estudiante | Texto | Todas | E-####, ?nico en cat?logo; referencias deben existir |
| grupo | Texto | estudiantes | ISC-1A, ISC-2A, ISC-3A |
| programa | Texto | estudiantes | Ingenieria en Sistemas Computacionales |
| fecha_sesion | Fecha | asistencia | Dentro del periodo y no posterior al corte |
| asistio | Booleano | asistencia | 0/1; equivalencias SI, s?, presente ? 1; no, ausente ? 0 |
| id_evaluacion | Texto | evaluaciones | Obligatorio; ?nico por estudiante |
| fecha_evaluacion | Fecha | evaluaciones | Dentro del periodo, no posterior al corte |
| calificacion | Decimal | evaluaciones | 0 a 10, inclusive; vac?o o texto se rechaza |
| id_actividad | Texto | entregas | Obligatorio; ?nico por estudiante |
| fecha_limite | Fecha | entregas | Dentro del periodo; puede ser posterior al corte |
| entregada | Booleano | entregas | 0/1, mismas equivalencias expl?citas de booleanos |

Claves: estudiante; estudiante-fecha de sesi?n; estudiante-id_evaluacion; estudiante-id_actividad. Se supone una sesi?n diaria sin desglose por materia. Si cambia ese alcance, ampliar la clave antes de generar datos.

Normalizaciones: e-1/E0001 ? E-0001; fechas DD/MM/AA con a?o 20AA (03/02/26 ? 2026-02-03). No inferir mes/d?a seg?n configuraci?n regional. Registrar original, normalizado y regla.

Duplicados exactos: conservar uno y registrar descarte. Conflictos: revisi?n expl?cita, sin escoger arbitrariamente. No imputar faltantes como cero. Conservar estudiantes sin hechos acad?micos.

## Indicadores por estudiante y ventana

- Asistencia: presencias/sesiones v?lidas ? 100; no calculable sin sesiones.
- Promedio: media de calificaciones v?lidas; no calculable sin evaluaciones.
- Entregas: actividades entregadas/actividades vencidas ? 100; no calculable sin vencidas. El CSV representa el estado observado al corte; no permite reconstruir estados hist?ricos de entrega.
- Tendencia: media de ?ltimas dos evaluaciones menos media anterior; no calculable con menos de tres evaluaciones. Ordenar por fecha e ID para desempatar.

La ventana corta se define del 2026-02-14 al 2026-03-13, ambos inclusive (28 d?as). Filtrar fechas antes de calcular contadores y suficiencia. La referencia de resultados incluida corresponde al periodo completo.

## Evidencia y l?mites

`manifest.json` documenta filas, hashes y 16 anomal?as con acci?n esperada. Las referencias limpias son un control independiente del futuro ETL. Los ?ndices esperados son criterios de prueba sujetos a las decisiones de suficiencia descritas en arquitectura.

Los perfiles son pedag?gicos; no estiman prevalencia real de rezago ni justifican cient?ficamente los pesos. La decisi?n final es del tutor.
