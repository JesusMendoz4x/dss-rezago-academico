# Datos ficticios de rezago acad?mico

Todos los registros son **simulados**, no representan personas ni provienen de una instituci?n. Sin nombres, correos ni matr?culas reales. Fixture v1.0.0, determinista y sin aleatoriedad.

## Contenido

| Fuente | Filas de referencia | Filas raw | Uso |
|---|---:|---:|---|
| estudiantes.csv | 30 | 30 | C?digo, grupo y programa |
| asistencia.csv | 693 | 699 | Sesiones y presencia |
| evaluaciones.csv | 111 | 115 | Desempe?o y evoluci?n |
| entregas.csv | 300 | 301 | Actividades y cumplimiento |

Tres grupos: ISC-1A, ISC-2A e ISC-3A, diez estudiantes cada uno. Periodo 2026-02-02 a 2026-03-27, fecha de corte fija **2026-03-13**. Asistencia hasta el 6 de marzo, una sesi?n diaria como m?ximo por estudiante. El corte no depende del reloj del equipo.

- `raw/`: entradas del futuro ETL; incluyen 16 anomal?as intencionales.
- `reference/`: entradas v?lidas de control, antes de introducir anomal?as. **No son salidas del ETL**.
- `reference/expected-indicators.json`: resultados esperados calculados sobre las referencias; son or?culos de prueba, no recomendaciones emitidas por la aplicaci?n.
- `dataset-spec.json`: periodo, reglas y receta de anomal?as.
- `manifest.json`: conteos, SHA-256 y ubicaci?n exacta de cada anomal?a (l?nea 1 es encabezado).
- `clean/` y `rejected/`: siguen vac?os hasta implementar el ETL.

## Reproducir

Con Node.js configurado, desde la ra?z, sin instalar paquetes adicionales:

```powershell
npm run data:generate
npm run data:check
```

El generador materializa la receta versionada a partir de `reference/*.csv`. Sobrescribe ?nicamente los cuatro CSV de raw y manifest.json; no modifica las referencias ni genera nuevas personas. No es un ETL: introduce anomal?as en vez de limpiarlas. Las referencias son CSV simples sin comillas; el generador valida esa restricci?n.

## Casos de aceptaci?n

| Estudiante | Caso |
|---|---|
| E-0001 | 95 % asistencia, promedio 9, entregas 100 %, tendencia 0: ?ndice 0 |
| E-0002 | Asistencia exactamente 90 %: riesgo parcial 0 |
| E-0003 | Sin sesiones: sin dictamen, sin dividir por cero |
| E-0004 | Una evaluaci?n: datos insuficientes |
| E-0005 | Todas las actividades vencen despu?s del corte: entregas no calculable |
| E-0006 | Sin evaluaciones: conservar en cat?logo, sin dictamen |
| E-0007 | 72 %, 6.5, 60 %, tendencia -1: **66.75, alto, mixto** |
| E-0008 | Solo tres sesiones: datos insuficientes |
| E-0009 | Solo dos evaluaciones: suficiente, pero sin historial anterior para tendencia |

Los dem?s perfiles cubren riesgo bajo, medio y alto; tambi?n hay cambios al comparar el periodo completo con las ?ltimas cuatro semanas. Pesos, umbrales y capacidad se probar?n con escenarios configurados, no alterando el significado de los datos.

Las expectativas excluyen componentes no calculables y renormalizan pesos disponibles. Este tratamiento sigue siendo una propuesta documentada para revisar con el tutor, especialmente la tendencia con dos evaluaciones.

## Calidad y relaci?n con la actividad

Incluye m?s de cuatro variables, fuentes documentadas y datos suficientes para asistencia, promedio, entregas y tendencia. Los 16 casos controlados cubren duplicados, IDs y fechas normalizables, fechas inv?lidas/futuras/fuera de periodo, referencias inexistentes, booleanos ambiguos y calificaciones negativas, superiores a 10, textuales o faltantes.

El ETL deber? registrar correcciones y rechazos con origen y motivo. Tras normalizar y descartar las anomal?as, los conjuntos limpios deben coincidir con las referencias, sin importar el orden de filas. La entrega futura E-0005 es v?lida: no se rechaza; se excluye de actividades vencidas. Una fecha futura de asistencia s? se rechaza. Los faltantes no se imputan a cero.

Pendiente para otra iteraci?n: duplicados contradictorios, cat?logos inv?lidos y encabezados incorrectos como archivos de prueba separados; interfaz de comparaci?n; registro persistente de trazabilidad. Estos CSV por s? solos no completan todos los requisitos de la actividad.
