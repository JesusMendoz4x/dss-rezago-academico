# Servicios DSS

- `etl/`: leer los cuatro CSV, normalizar identificadores y fechas, validar rangos y referencias, detectar duplicados y producir reporte de calidad. Registrar archivo, fila, campo, valor y motivo de cada rechazo.
- `indicators/`: asistencia, promedio, entregas y tendencia por estudiante y ventana temporal. Conservar referencias a las filas de origen; no sustituir faltantes por cero.
- `decision/`: ?ndice ponderado, clasificaci?n, explicaciones y comparaci?n de escenarios. Rechazar configuraciones inv?lidas y devolver sin dictamen cuando falten datos.

Estos directorios son puntos de implementaci?n; a?n no procesan datos.
