# Diccionario inicial

| Campo | Fuente | Regla |
|---|---|---|
| id_estudiante | Todas | C?digo ficticio E-####; ?nico en cat?logo |
| grupo | estudiantes | Obligatorio; cat?logo a definir |
| programa | estudiantes | Obligatorio |
| fecha_sesion | asistencia | Fecha v?lida dentro del periodo y no posterior al corte |
| asistio | asistencia | Booleano normalizado 0/1 |
| id_evaluacion | evaluaciones | Obligatorio; ?nico por estudiante |
| fecha_evaluacion | evaluaciones | Fecha v?lida dentro del periodo |
| calificacion | evaluaciones | Decimal de 0 a 10 |
| id_actividad | entregas | Obligatorio; ?nico por estudiante |
| fecha_limite | entregas | Fecha v?lida; solo vencidas para indicador de entregas |
| entregada | entregas | Booleano 0/1 |

CSV UTF-8. Fechas limpias AAAA-MM-DD. El ETL registrar? transformaciones de IDs (e-1 ? E-0001), fechas y booleanos. Los duplicados contradictorios se enviar?n a revisi?n; no elegir arbitrariamente. Conservar estudiantes sin evaluaciones como datos insuficientes.

Indicadores: asistencias/sesiones*100, promedio v?lido, entregadas/vencidas*100 y diferencia entre media de ?ltimas dos evaluaciones y media anterior. Un denominador cero produce un valor no calculable, no cero.
