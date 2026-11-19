# Capacidad semanal del tutor

En Resumen se introduce una capacidad entera no negativa y se confirma con Aplicar capacidad. La capacidad inicial es 5. Una entrada inválida no sustituye la capacidad aplicada ni modifica la selección vigente.

Se seleccionan hasta N estudiantes de riesgo alto o medio, ordenados por índice descendente y código en caso de empate. Los restantes elegibles quedan pendientes. Riesgo bajo queda en monitoreo y sin dictamen queda en completar datos. Ningún registro se elimina ni se altera su índice, posición o recomendación.

El plan abarca todos los grupos del escenario seleccionado. Los filtros de grupo, nivel, texto y estado semanal solo modifican la visualización. No recalculan la asignación ni liberan espacios. Cambiar de escenario o actualizar los datos recalcula el plan con la misma capacidad aplicada.

Los espacios disponibles son capacidad menos casos seleccionados; no se rellenan con riesgo bajo ni con datos insuficientes. Con capacidad cero todos los casos elegibles quedan pendientes.

Estado en memoria del navegador: no representa atención realizada, una reserva confirmada ni un historial. No se persiste al recargar ni cambia la configuración del escenario almacenada en el servidor.

Verificación: `npm.cmd run test:capacity`. Cinco pruebas cubren selección y empates, capacidad cero, exceso de capacidad, entradas inválidas y no mutación. Se ejecutaron en V8 con adaptadores; la ejecución Node y la validación visual en navegador siguen pendientes.
