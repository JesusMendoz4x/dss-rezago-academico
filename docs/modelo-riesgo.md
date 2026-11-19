# Priorización explicable

El Resumen consulta `GET /api/recommendations?scenario=base`. Admite IDs del archivo `server/config/scenarios.json`; un ID desconocido responde 400. La consulta extrae y valida las fuentes, calcula indicadores por ventana y aplica el modelo. No modifica los CSV ni carga/persiste recomendaciones en MySQL.

## Reglas

Riesgos parciales acotados a [0,100], con rangos configurables:

- Asistencia: (90 - porcentaje) / 30 × 100.
- Desempeño: (8 - promedio) / 2 × 100.
- Entregas: (90 - porcentaje) / 40 × 100.
- Tendencia: -tendencia / 2 × 100.

Pesos base: .30, .35, .20 y .15. Alto desde 60, medio desde 30 y bajo por debajo de 30. Se clasifica sin redondear; el formato de pantalla usa dos decimales. Desempate por código de estudiante. Los estudiantes sin dictamen no reciben posición numérica.

Menos de cuatro sesiones o dos evaluaciones: sin dictamen. También se exige asistencia y promedio calculables. Sin entregas vencidas o historial de tendencia: excluir el componente y renormalizar los pesos disponibles, con aviso. Este tratamiento es el supuesto de diseño previamente documentado; debe revisarse con el tutor. Si no queda ningún componente con peso positivo, no emitir dictamen.

Tipo asistencia/académico cuando el riesgo correspondiente alcanza 50 y el otro no; mixto si ambos lo alcanzan; general para nivel medio/alto sin esos factores predominantes; sin predominio para nivel bajo sin esos factores.

## Evidencias y límites

La respuesta incluye indicadores, conteos, registros de origen, riesgos parciales, pesos originales y efectivos, aportaciones, regla, escenario completo y huella de fuentes. La pantalla permite inspeccionar los registros utilizados. Es trazabilidad de una consulta actual; su almacenamiento histórico sigue pendiente.

E-0007 debe producir 66.75, alto y mixto. Las pruebas de `npm.cmd run test:risk` comparan los 30 estudiantes contra los resultados esperados, verifican umbrales, insuficiencia, ajustes de pesos y escenarios.

El selector muestra un escenario por vez. El comparador simultáneo, parámetros editables y capacidad del tutor se implementarán después. Los datos son ficticios y los criterios no son parámetros institucionales validados. El índice orienta el apoyo, no decide acreditación ni sanciones.

En el fixture actual los perfiles de asistencia y desempeño están correlacionados: priorizar asistencia cambia los índices, pero no necesariamente el orden ni el nivel. Las pruebas incluyen además dos perfiles controlados con riesgos opuestos para comprobar una inversión de prioridades. No se fuerza un cambio visual si el cálculo no lo produce.
