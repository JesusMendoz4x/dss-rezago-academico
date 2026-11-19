# Avances y siguientes pasos

## Implementado

- [x] Fuentes ficticias y receta reproducible con manifiesto.
- [x] ETL: normalización, validación, rechazos, duplicados y conflictos.
- [x] Evidencias locales y código de carga transaccional MySQL.
- [x] Indicadores por estudiante y ventana temporal.
- [x] Índice explicable con suficiencia, pesos efectivos y trazabilidad de consulta.
- [x] Resumen priorizado, filtros, detalle de estudiantes y calidad de fuentes.
- [x] Comparación simultánea de dos escenarios sobre una misma extracción.
- [x] Navegación solo a secciones funcionales.

## Próximos avances, uno por entrega

1. Capacidad del tutor: definir N casos, mostrar cuáles puede atender y cuántos quedan fuera sin ocultarlos.
2. Parámetros editables: validar pesos y umbrales y recalcular con una configuración identificable.
3. Integración MySQL: comprobar carga real, consultar un lote seleccionado y guardar configuraciones/resultados históricos.
4. Cierre de validación: ejecutar suite completa con Node, revisar navegador en móvil/escritorio, completar matriz, evidencias y guion final.

## Verificaciones pendientes

Node no está accesible desde la terminal del agente: las comprobaciones del núcleo se realizan en V8 con adaptadores. Arranque HTTP, compilación Vite, navegación real e integración con MySQL requieren verificación en el entorno del usuario. Las pruebas Node están disponibles por comandos en package.json.

Los parámetros son supuestos académicos; deben justificarse con el tutor. El índice no decide acreditación ni sanciones. Documentar posibles sesgos por condiciones de salud, trabajo o transporte.
