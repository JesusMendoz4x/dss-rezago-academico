# Arquitectura inicial

React ? `/api` ? Express ? servicios DSS ? repositorios ? MySQL.

ETL: CSV ? normalizaci?n y validaci?n ? tablas limpias y registro de anomal?as ? indicadores ? modelo explicable ? recomendaciones y trazabilidad ? interfaz.

## Requisitos del documento

- Decisi?n: a qu? estudiantes dar seguimiento semanal y qu? tipo de apoyo considerar.
- Al menos cuatro variables, tres indicadores y dos escenarios comparables.
- Calidad: duplicados, formatos, rangos, faltantes y referencias al cat?logo.
- Pruebas: normales, faltantes, inconsistentes y l?mites.
- Trazabilidad: configuraci?n, fecha de corte, entradas, indicadores, aportaciones y regla de clasificaci?n.

## Modelo previsto

Riesgos acotados a [0,100]: asistencia `(90-I1)/30*100`; desempe?o `(8-I2)/2*100`; entregas `(90-I3)/40*100`; tendencia `-I4/2*100`.

?ndice base: 0.30 asistencia + 0.35 desempe?o + 0.20 entregas + 0.15 tendencia. Alto >=60; medio >=30 y <60; bajo <30. Menos de cuatro sesiones o dos evaluaciones: sin dictamen.

El ejemplo 72 %, 6.5, 60 % y tendencia -1 debe producir 66.75, alto y mixto. Los pesos y umbrales son supuestos acad?micos pendientes de justificaci?n.

## Decisiones por confirmar antes del modelo

Sin actividades vencidas: excluir entregas y renormalizar pesos, con aviso. Con solo dos evaluaciones, no hay historial para calcular tendencia: propuesta de excluirla y renormalizar tambi?n. Validar ambos criterios con el tutor.

La clave estudiante-fecha de asistencia supone una sesi?n diaria. Si hay varias, incorporar id_sesion antes de deduplicar. La zona horaria acad?mica y el periodo se definir?n expl?citamente; fechas de clases son DATE y eventos de auditor?a se guardar?n en UTC.

## Alcance de esta entrega

Arranque, escenarios, esquema y ETL implementados. El ETL incluye evidencias locales y carga transaccional MySQL; ver [proceso ETL](etl.md). Autenticación, indicadores, clasificación, comparador e interfaz de calidad siguen pendientes. No se desplegó el sistema.
